// Copyright 2026 MrTanXin.
// SPDX-License-Identifier: Apache-2.0
import { Comparer } from "@/lib/editor/comparer";
import type { EditorWrapper } from "@/lib/editor/editor";

describe("Comparer auto refresh", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test("refreshes the diff after an editor update once comparison is active", async () => {
    vi.useFakeTimers();

    const compareTree = vi.fn().mockResolvedValue([]);
    let rightText = '{"value":1}';
    const main = createEditor('{"value":1}', compareTree);
    const secondary = createEditor(() => rightText, compareTree);
    const comparer = new Comparer(main.wrapper, secondary.wrapper);
    const highlightDiff = vi.spyOn(comparer, "highlightDiff").mockImplementation(() => undefined);

    main.notifyChange();
    secondary.notifyChange();
    await vi.advanceTimersByTimeAsync(30);
    expect(compareTree).not.toHaveBeenCalled();

    await comparer.compare();
    expect(compareTree).toHaveBeenCalledTimes(1);
    expect(highlightDiff).toHaveBeenCalledTimes(1);

    rightText = '{"value":2}';
    secondary.notifyChange();
    await vi.advanceTimersByTimeAsync(29);
    expect(compareTree).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(compareTree).toHaveBeenCalledTimes(2);
    expect(highlightDiff).toHaveBeenCalledTimes(2);
  });

  test("does not queue stale comparisons while the worker is busy", async () => {
    vi.useFakeTimers();

    let resolveFirst!: (value: []) => void;
    const compareTree = vi
      .fn()
      .mockImplementationOnce(() => new Promise<[]>((resolve) => (resolveFirst = resolve)))
      .mockResolvedValue([]);
    let rightText = '{"value":1}';
    const main = createEditor('{"value":1}', compareTree);
    const secondary = createEditor(() => rightText, compareTree);
    const comparer = new Comparer(main.wrapper, secondary.wrapper);
    const highlightDiff = vi.spyOn(comparer, "highlightDiff").mockImplementation(() => undefined);

    const comparePromise = comparer.compare();
    expect(compareTree).toHaveBeenCalledTimes(1);

    rightText = '{"value":2}';
    secondary.notifyChange();
    await vi.advanceTimersByTimeAsync(30);
    expect(compareTree).toHaveBeenCalledTimes(1);

    resolveFirst([]);
    await vi.advanceTimersByTimeAsync(0);
    await comparePromise;

    expect(compareTree).toHaveBeenCalledTimes(2);
    expect(highlightDiff).toHaveBeenCalledTimes(1);
  });

  test("stops pending comparisons and clears highlights", async () => {
    vi.useFakeTimers();

    let resolveCompare!: (value: []) => void;
    const compareTree = vi.fn().mockImplementation(() => new Promise<[]>((resolve) => (resolveCompare = resolve)));
    const main = createEditor('{"value":1}', compareTree);
    const secondary = createEditor('{"value":2}', compareTree);
    const comparer = new Comparer(main.wrapper, secondary.wrapper);
    const highlightDiff = vi.spyOn(comparer, "highlightDiff").mockImplementation(() => undefined);
    const reset = vi.spyOn(comparer, "reset").mockImplementation(() => undefined);

    const comparePromise = comparer.compare();
    comparer.stop();
    resolveCompare([]);

    await comparePromise;
    await vi.advanceTimersByTimeAsync(30);

    expect(reset).toHaveBeenCalledTimes(1);
    expect(highlightDiff).not.toHaveBeenCalled();
    expect(compareTree).toHaveBeenCalledTimes(1);
  });
});

function createEditor(text: string | (() => string), compareTree: ReturnType<typeof vi.fn>) {
  const onDidChangeModelContent = vi.fn();
  const wrapper = {
    text: typeof text === "function" ? text : () => text,
    tree: {},
    isTreeValid: () => true,
    worker: () => ({ compareTree, compareText: compareTree }),
    listenOnScroll: vi.fn(),
    editor: { onDidChangeModelContent },
  } as unknown as EditorWrapper;

  return {
    wrapper,
    notifyChange: () => onDidChangeModelContent.mock.calls[0][0](),
  };
}
