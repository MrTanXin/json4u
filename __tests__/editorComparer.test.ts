import type { EditorWrapper } from "@/lib/editor/editor";
import { Comparer } from "@/lib/editor/comparer";

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
    await vi.advanceTimersByTimeAsync(300);
    expect(compareTree).not.toHaveBeenCalled();

    await comparer.compare();
    expect(compareTree).toHaveBeenCalledTimes(1);
    expect(highlightDiff).toHaveBeenCalledTimes(1);

    rightText = '{"value":2}';
    secondary.notifyChange();
    await vi.advanceTimersByTimeAsync(299);
    expect(compareTree).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(compareTree).toHaveBeenCalledTimes(2);
    expect(highlightDiff).toHaveBeenCalledTimes(2);
  });
});

function createEditor(text: string | (() => string), compareTree: ReturnType<typeof vi.fn>) {
  const onDidChangeModelContent = vi.fn();
  const wrapper = {
    text: typeof text === "function" ? text : () => text,
    tree: {},
    isTreeValid: () => true,
    worker: () => ({ compareTree }),
    listenOnScroll: vi.fn(),
    editor: { onDidChangeModelContent },
  } as unknown as EditorWrapper;

  return {
    wrapper,
    notifyChange: () => onDidChangeModelContent.mock.calls[0][0](),
  };
}
