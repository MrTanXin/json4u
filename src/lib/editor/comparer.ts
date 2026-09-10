import type { Diff, DiffPair, DiffType, Range } from "@/lib/compare";
import { newRange } from "@/lib/compare";
import { getStatusState } from "@/stores/statusStore";
import { debounce, type DebouncedFunc } from "lodash-es";
import { getInlineClass, getLineClass, getMarginClass, getMinimapColor, getOverviewRulerColor } from "./diffColor";
import type { EditorWrapper, Kind } from "./editor";
import { editorApi } from "./types";

const compareWait = 30;

interface CompareResult {
  diffPairs: DiffPair[];
  isTextCompare: boolean;
}

function compareLog(event: string, details: Record<string, unknown> = {}) {
  console.info("[json4u:compare]", event, details);
}

export class Comparer {
  main: EditorWrapper;
  secondary: EditorWrapper;
  leftDecorations?: editorApi.IEditorDecorationsCollection;
  rightDecorations?: editorApi.IEditorDecorationsCollection;
  leftBlankHunkIDs?: string[];
  rightBlankHunkIDs?: string[];
  private comparisonActive = false;
  private comparisonVersion = 0;
  private compareInFlight?: {
    version: number;
    promise: Promise<CompareResult>;
  };
  private refreshScheduled = false;
  private refreshAfterEdit: DebouncedFunc<() => void>;

  constructor(main: EditorWrapper, secondary: EditorWrapper) {
    this.main = main;
    this.secondary = secondary;
    this.refreshAfterEdit = debounce(() => {
      this.refreshScheduled = false;
      void this.refresh(this.comparisonVersion);
    }, compareWait);
    this.main.listenOnScroll();
    this.secondary.listenOnScroll();
    this.main.editor.onDidChangeModelContent(() => this.onEditorUpdated());
    this.secondary.editor.onDidChangeModelContent(() => this.onEditorUpdated());
  }

  worker() {
    return this.main.worker();
  }

  enableTextCompare() {
    return getStatusState().enableTextCompare;
  }

  monacoEditor(kind: Kind) {
    return (kind === "main" ? this.main : this.secondary).editor;
  }

  private async compareCurrent(): Promise<CompareResult> {
    const startedAt = Date.now();
    const isTextCompare = this.enableTextCompare() || !(this.main.isTreeValid() && this.secondary.isTreeValid());
    const mainText = this.main.text();
    const secondaryText = this.secondary.text();
    try {
      const diffPairs = isTextCompare
        ? await this.worker().compareText(mainText, secondaryText)
        : await this.worker().compareTree(this.main.tree, this.secondary.tree);
      compareLog("worker completed", {
        mode: isTextCompare ? "text" : "tree",
        mainLength: mainText.length,
        secondaryLength: secondaryText.length,
        diffPairs: diffPairs.length,
        durationMs: Date.now() - startedAt,
      });
      return { diffPairs, isTextCompare };
    } catch (error) {
      compareLog("worker failed", {
        mode: isTextCompare ? "text" : "tree",
        mainLength: mainText.length,
        secondaryLength: secondaryText.length,
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async compare(): Promise<CompareResult | undefined> {
    this.comparisonActive = true;
    this.refreshAfterEdit.cancel();
    this.refreshScheduled = false;
    this.comparisonVersion++;
    compareLog("requested", { version: this.comparisonVersion });

    // A compare can already be running because of an earlier edit. Wait for it
    // and retry with the latest editor contents instead of queuing another
    // request in the single compare worker.
    while (this.comparisonActive) {
      const result = await this.compareForVersion(this.comparisonVersion);
      if (result) {
        return result;
      }
    }

    return undefined;
  }

  onEditorUpdated() {
    if (!this.comparisonActive) {
      return;
    }

    // Invalidate an in-flight comparison and coalesce rapid edits into one refresh.
    this.comparisonVersion++;
    this.refreshScheduled = true;
    compareLog("editor changed", {
      version: this.comparisonVersion,
      mainLength: this.main.text().length,
      secondaryLength: this.secondary.text().length,
      refreshWaitMs: compareWait,
    });
    this.refreshAfterEdit();
  }

  stop() {
    this.comparisonActive = false;
    this.comparisonVersion++;
    this.refreshAfterEdit.cancel();
    this.refreshScheduled = false;
    this.reset();
    compareLog("stopped", { version: this.comparisonVersion });
  }

  private async refresh(version: number) {
    if (!this.comparisonActive || version !== this.comparisonVersion) {
      return;
    }

    const result = await this.compareForVersion(version);
    if (result) {
      return;
    }

    // If the editor changed while the worker was busy, the edit handler may
    // already have scheduled the next refresh. If it did not, continue with
    // the newest version immediately so a stale result cannot leave the view
    // without highlights.
    if (this.comparisonActive && version !== this.comparisonVersion && !this.refreshScheduled) {
      void this.refresh(this.comparisonVersion);
    }
  }

  private async compareForVersion(version: number): Promise<CompareResult | undefined> {
    if (!this.comparisonActive || version !== this.comparisonVersion) {
      return undefined;
    }

    const reused = !!this.compareInFlight;
    const request = this.compareInFlight ?? this.startCompare(version);
    if (reused) {
      compareLog("reusing in-flight worker request", {
        requestedVersion: version,
        requestVersion: request.version,
      });
    }
    const result = await request.promise;

    // Ignore results calculated against an older editor snapshot. The caller
    // will either retry immediately (manual compare) or wait for the debounced
    // refresh (editor update).
    if (!this.comparisonActive || request.version !== this.comparisonVersion || version !== this.comparisonVersion) {
      compareLog("discarded stale result", {
        requestVersion: request.version,
        requestedVersion: version,
        currentVersion: this.comparisonVersion,
      });
      return undefined;
    }

    this.highlightDiff(result.diffPairs, result.isTextCompare);
    compareLog("highlights applied", {
      version,
      mode: result.isTextCompare ? "text" : "tree",
      diffPairs: result.diffPairs.length,
    });
    return result;
  }

  private startCompare(version: number) {
    const request = {
      version,
      promise: this.compareCurrent(),
    };
    this.compareInFlight = request;
    request.promise.then(
      () => this.clearCompareInFlight(request),
      () => this.clearCompareInFlight(request),
    );
    return request;
  }

  private clearCompareInFlight(request: { version: number; promise: Promise<CompareResult> }) {
    if (this.compareInFlight === request) {
      this.compareInFlight = undefined;
    }
  }

  highlightDiff(diffPairs: DiffPair[], isTextCompare: boolean) {
    this.reset();
    this.genRanges(diffPairs);

    // Highlight diffs.
    const decorations = genHighlightDecorations(diffPairs);
    this.applyDecorations(decorations);
    isTextCompare && this.fillBlankHunkDoms(diffPairs);

    // Comparing must not steal focus or move either editor's cursor/selection.
    // This applies to both manual comparisons and automatic refreshes.
  }

  // Calculates the range of the diff in the editor and generates a region.
  genRanges(diffPairs: DiffPair[]) {
    const newRangeFromDiff = (editor: EditorWrapper, diff: Diff) => {
      const range: Range = {
        ...editor.range(diff.offset, diff.length),
        ...diff,
      };

      // If the region length is 1 and the column numbers are both 1, it means there is only one newline character.
      // In this case, we need to adjust it to avoid highlighting to the next line.
      if (range.length === 1 && range.startColumn === 1 && range.endColumn === 1) {
        range.endLineNumber = range.startLineNumber;
      }
      return range;
    };

    diffPairs.forEach(({ left, right }) => {
      if (left) {
        left.range = newRangeFromDiff(this.main, left);
        left.inlineDiffs?.forEach((d) => {
          d.range = newRangeFromDiff(this.main, d);
        });
      }

      if (right) {
        right.range = newRangeFromDiff(this.secondary, right);
        right.inlineDiffs?.forEach((d) => {
          d.range = newRangeFromDiff(this.secondary, d);
        });
      }
    });
  }

  // Apply decorations.
  applyDecorations({ left, right }: { left: Decoration[]; right: Decoration[] }) {
    this.leftDecorations = this.monacoEditor("main").createDecorationsCollection(left);
    this.rightDecorations = this.monacoEditor("secondary").createDecorationsCollection(right);
  }

  // If highlighting the result of a text comparison, you need to generate blank blocks on the two intersecting diffs to fill them,
  // so that the diffs on the left and right sides look the same height.
  fillBlankHunkDoms(diffPairs: DiffPair[]) {
    const applyViewZones = (kind: Kind, ranges: Range[]) => {
      let ids: string[] = [];

      this.monacoEditor(kind).changeViewZones((changeAccessor) => {
        ids = ranges.map(({ startLineNumber, endLineNumber }) =>
          changeAccessor.addZone({
            afterLineNumber: startLineNumber - 1,
            heightInLines: endLineNumber - startLineNumber + 1,
            domNode: genBlankHunkDom(),
          }),
        );
      });

      return ids;
    };

    const { left, right } = genFillRanges(diffPairs);
    this.leftBlankHunkIDs = applyViewZones("main", left);
    this.rightBlankHunkIDs = applyViewZones("secondary", right);
  }

  reset() {
    // NOTICE: You cannot use model.getAllDecorations to delete all of them, as this will cause the collapse button to disappear.
    this.leftDecorations?.clear();
    this.rightDecorations?.clear();

    this.monacoEditor("main").changeViewZones((changeAccessor) => {
      for (const id of this.leftBlankHunkIDs ?? []) {
        changeAccessor.removeZone(id);
      }
    });
    this.monacoEditor("secondary").changeViewZones((changeAccessor) => {
      for (const id of this.rightBlankHunkIDs ?? []) {
        changeAccessor.removeZone(id);
      }
    });

    delete this.leftDecorations;
    delete this.rightDecorations;
    delete this.leftBlankHunkIDs;
    delete this.rightBlankHunkIDs;
  }
}

// Generate ranges for fill blocks.
function genFillRanges(pairs: DiffPair[]): { left: Range[]; right: Range[] } {
  const leftRanges: Range[] = [];
  const rightRanges: Range[] = [];
  // The cumulative number of lines filled by the fill block.
  let lAggr = 0;
  let rAggr = 0;

  const addLeftFill = (fill: Range) => {
    leftRanges.push(rangeMinus(fill, lAggr));
    lAggr += countRange(fill);
  };
  const addRightFill = (fill: Range) => {
    rightRanges.push(rangeMinus(fill, rAggr));
    rAggr += countRange(fill);
  };

  // Iterate through all diff pairs to calculate and add filler decorations to align the diffs in a side-by-side view.
  // For each pair, it determines whether filler lines need to be added to the left or right editor to visually align the mismatched lines.
  // If a block exists only on one side, filler is added to the other. If both blocks exist but have different lengths, filler is added below the shorter block.
  for (const { left, right } of pairs) {
    const lStart = left?.range?.startLineNumber ?? 0;
    const lEnd = left?.range?.endLineNumber ?? 0;
    const rStart = right?.range?.startLineNumber ?? 0;
    const rEnd = right?.range?.endLineNumber ?? 0;
    const lFillStart = left ? lStart + lAggr : 0;
    const lFillEnd = left ? lEnd + lAggr : 0;
    const rFillStart = right ? rStart + rAggr : 0;
    const rFillEnd = right ? rEnd + rAggr : 0;

    // If the two do not overlap.
    if (lFillEnd < rFillStart || rFillEnd < lFillStart) {
      if (left) {
        addRightFill(newRange(lStart + lAggr, lEnd + lAggr));
      }
      if (right) {
        addLeftFill(newRange(rStart + rAggr, rEnd + rAggr));
      }
    } else {
      // Note: Because ls === rs always holds, the filling is always done at the bottom.
      if (lFillEnd <= rFillEnd) {
        addLeftFill(newRange(Math.max(lFillEnd + 1, rFillStart), rFillEnd));
      } else if (rFillEnd < lFillEnd) {
        addRightFill(newRange(Math.max(rFillEnd + 1, lFillStart), lFillEnd));
      }
    }
  }

  return { left: leftRanges, right: rightRanges };
}

function genBlankHunkDom() {
  const node = document.createElement("div");
  node.className = "blank-hunk";
  return node;
}

// Generate diff block highlights and inline highlights.
function genHighlightDecorations(diffPairs: DiffPair[]): {
  left: Decoration[];
  right: Decoration[];
} {
  const leftHunks: Decoration[] = [];
  const rightHunks: Decoration[] = [];
  const leftDecorations: Decoration[] = [];
  const rightDecorations: Decoration[] = [];

  for (const { left, right } of diffPairs) {
    const { hunk: leftHunk, inlines: leftInlines } = genDecorations(left);
    const { hunk: rightHunk, inlines: rightInlines } = genDecorations(right);

    leftHunk && leftHunks.push(leftHunk);
    rightHunk && rightHunks.push(rightHunk);
    leftInlines.length > 0 && leftDecorations.push(...leftInlines);
    rightInlines.length > 0 && rightDecorations.push(...rightInlines);
  }

  const compare = (a: Decoration, b: Decoration) => a.range.startLineNumber - b.range.startLineNumber;
  const left = leftDecorations.concat(mergeDecorations(leftHunks.sort(compare)));
  const right = rightDecorations.concat(mergeDecorations(rightHunks.sort(compare)));
  return { left, right };
}

function mergeDecorations(decorations: Decoration[]): Decoration[] {
  if (decorations.length === 0) {
    return [];
  }

  const merged = [decorations[0]];

  for (const decoration of decorations.slice(1)) {
    const prev = merged[merged.length - 1];
    const { startLineNumber, endLineNumber } = decoration.range;

    if (startLineNumber <= prev.range.endLineNumber) {
      prev.range.endLineNumber = Math.max(endLineNumber, prev.range.endLineNumber);
    } else {
      merged.push(decoration);
    }
  }

  return merged;
}

function genDecorations(diff: Diff | undefined): {
  hunk?: Decoration;
  inlines: Decoration[];
} {
  if (!diff) {
    return { inlines: [] };
  }

  const type = diff.type;
  const hunk = newDecoration(diff.range!, false, type);
  const inlines = diff.inlineDiffs?.map((d) => newDecoration(d.range!, true, type)) ?? [];
  return { hunk, inlines };
}

interface Decoration {
  range: Range;
  // example: https://microsoft.github.io/monaco-editor/playground.html#interacting-with-the-editor-line-and-inline-decorations
  // spec: https://microsoft.github.io/monaco-editor/typedoc/interfaces/editor.IModelDecorationOptions.html
  options: editorApi.IModelDecorationOptions;
}

// Generate highlighted decorations.
function newDecoration(range: Range, isInlineDiff: boolean, diffType: DiffType): Decoration {
  if (isInlineDiff) {
    return {
      range,
      options: {
        // Decoration class for inline text.
        inlineClassName: getInlineClass(diffType),
      },
    };
  } else {
    return {
      range,
      // Example: https://microsoft.github.io/monaco-editor/playground.html#interacting-with-the-editor-line-and-inline-decorations
      // Parameter definition: https://microsoft.github.io/monaco-editor/typedoc/interfaces/editor.IModelDecorationOptions.html
      options: {
        // Highlight the entire line.
        isWholeLine: true,
        // Decoration class for the entire line of text.
        className: getLineClass(diffType),
        marginClassName: getMarginClass(diffType),
        // Highlight the minimap on the right.
        minimap: {
          color: getMinimapColor(diffType),
          position: window.monacoApi.MinimapPosition.Inline,
        },
        // Highlight the overview ruler on the right of the minimap.
        overviewRuler: {
          color: getOverviewRulerColor(diffType),
          position: window.monacoApi.OverviewRulerLane.Full,
        },
      },
    };
  }
}

function rangeMinus(range: Range, n: number) {
  return {
    ...range,
    startLineNumber: range.startLineNumber - n,
    endLineNumber: range.endLineNumber - n,
  };
}

function countRange(range: Range) {
  return range.endLineNumber > 0 ? range.endLineNumber - range.startLineNumber + 1 : 0;
}
