// Copyright 2026 MrTanXin.
// SPDX-License-Identifier: Apache-2.0
import { autoUnescape, unescape } from "@/lib/worker/command/escape";

describe("auto unescape", () => {
  test("unescapes one layer of an escaped JSON document", () => {
    const input = String.raw`{\"field_1\":\"\\u67E5\\u4F59\\u989D\",\"field_2\":\"10003131****06805\",\"field_3\":\"Z000****0006\",\"field_4\":\"20260710****231614\",\"field_5\":\"20260710102017\",\"field_6\":\"MEYCIQCQ6nhPZhhOWxQd2c9M****Z0WrYUomdJt\"}`;
    const expected = String.raw`{"field_1":"\u67E5\u4F59\u989D","field_2":"10003131****06805","field_3":"Z000****0006","field_4":"20260710****231614","field_5":"20260710102017","field_6":"MEYCIQCQ6nhPZhhOWxQd2c9M****Z0WrYUomdJt"}`;

    expect(unescape(input)).toBe(expected);
    expect(autoUnescape(input)).toBe(expected);
  });

  test("unwraps a JSON string containing a JSON document", () => {
    const inner = String.raw`{"message":"hello"}`;
    const input = JSON.stringify(inner);

    expect(autoUnescape(input)).toBe(inner);
  });

  test("does not change ordinary valid JSON", () => {
    const input = String.raw`{"message":"他说：\"你好\""}`;

    expect(autoUnescape(input)).toBe(input);
  });

  test("keeps invalid escaped input unchanged", () => {
    const input = String.raw`{\"message\":\"unterminated}`;

    expect(autoUnescape(input)).toBe(input);
  });
});
