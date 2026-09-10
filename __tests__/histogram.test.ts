// Copyright 2026 MrTanXin.
// SPDX-License-Identifier: Apache-2.0
import { compareText } from "@/lib/compare";

describe("text compare performance safeguards", () => {
  test("returns immediately for identical large text", () => {
    const text = Array.from({ length: 5000 }, (_, index) => `  "field_${index}": "same"`).join("\n");

    expect(compareText(text, text)).toEqual([]);
  });

  test("uses a bounded result for highly repetitive large text", () => {
    const left = Array.from({ length: 1500 }, () => '  "same": true');
    const right = [...left];
    right[750] = '  "same": false';

    const pairs = compareText(left.join("\n"), right.join("\n"));

    expect(pairs).toHaveLength(1);
    expect(pairs[0].left?.length).toBeGreaterThan(0);
    expect(pairs[0].right?.length).toBeGreaterThan(0);
  });

  test("uses a bounded result for large text with unique lines", () => {
    const left = Array.from({ length: 2500 }, (_, index) => `line-${index}: value`);
    const right = [...left];
    right[1250] = "line-1250: changed";

    const pairs = compareText(left.join("\n"), right.join("\n"));

    expect(pairs).toHaveLength(1);
    expect(pairs[0].left?.length).toBeGreaterThan(0);
    expect(pairs[0].right?.length).toBeGreaterThan(0);
  });
});
