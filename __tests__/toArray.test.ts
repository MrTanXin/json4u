// Copyright 2026 MrTanXin.
// SPDX-License-Identifier: Apache-2.0
import { toArray } from "@/lib/worker/command/toArray";

describe("toArray", () => {
  test("converts a column copied from Excel", () => {
    expect(toArray("1\r\n2\r\n3\r\n", "number")).toBe("[1,2,3]");
    expect(toArray("apple\r\nbanana\r\n", "string")).toBe('["apple","banana"]');
  });

  test("flattens rows and columns and skips empty cells", () => {
    expect(toArray("1\t2\r\n\t4\r\n\r\n5\t6", "number")).toBe("[1,2,4,5,6]");
  });

  test("keeps numbers as strings in string mode", () => {
    expect(toArray("001\n002", "string")).toBe('["001","002"]');
  });

  test("normalizes number formats and keeps precision", () => {
    expect(toArray("1,234.5\n-0.5\n+3\n.5\n007\n1e3", "number")).toBe("[1234.5,-0.5,3,0.5,7,1e3]");
    expect(toArray("12345678901234567890\n2", "number")).toBe("[12345678901234567890,2]");
  });

  test("keeps non-numeric cells as strings in number mode", () => {
    expect(toArray("1\nN/A\n3", "number")).toBe('[1,"N/A",3]');
  });

  test("escapes special characters in strings", () => {
    expect(toArray('say "hi"\nC:\\path', "string")).toBe(String.raw`["say \"hi\"","C:\\path"]`);
  });

  test("handles quoted cells containing line breaks", () => {
    expect(toArray('"line 1\nline 2"\tb', "string")).toBe(String.raw`["line 1\nline 2","b"]`);
  });

  test("splits a single line by commas", () => {
    expect(toArray("1, 2，3", "number")).toBe("[1,2,3]");
    expect(toArray("a, b", "string")).toBe('["a","b"]');
    expect(toArray("hello world", "string")).toBe('["hello world"]');
    expect(toArray("1,234\r\n", "number")).toBe("[1234]");
  });

  test("keeps valid JSON and JSON-like text unchanged", () => {
    for (const text of ["123", '"abc"', "[1, 2]", '{"a": 1}', '{"a": 1,', "[1, 2", "  ", ""]) {
      expect(toArray(text, "number")).toBe(text);
      expect(toArray(text, "string")).toBe(text);
    }
  });
});
