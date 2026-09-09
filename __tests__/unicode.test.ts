import { unicode } from "@/lib/worker/command/escape";

describe("unicode", () => {
  test("decodes the escaped JSON example", () => {
    const input = String.raw`{\"field_1\":\"\\u67E5\\u4F59\\u989D\",\"field_2\":\"10003131****06805\",\"field_3\":\"Z000****0006\",\"field_4\":\"20260710****231614\",\"field_5\":\"20260710102017\",\"field_6\":\"MEYCIQCQ6nhPZhhOWxQd2c9M****Z0WrYUomdJt\"}`;
    const expected = String.raw`{"field_1":"查余额","field_2":"10003131****06805","field_3":"Z000****0006","field_4":"20260710****231614","field_5":"20260710102017","field_6":"MEYCIQCQ6nhPZhhOWxQd2c9M****Z0WrYUomdJt"}`;

    expect(unicode(input)).toBe(expected);
  });

  test("decodes Unicode characters and surrogate pairs", () => {
    expect(unicode(String.raw`{"message":"\u4F60\u597D"}`)).toBe(String.raw`{"message":"你好"}`);
    expect(unicode(String.raw`{"emoji":"\uD83D\uDE00"}`)).toBe(String.raw`{"emoji":"😀"}`);
  });

  test("keeps escaped literals and malformed Unicode unchanged", () => {
    const literal = String.raw`{"value":"\\u4F60"}`;
    const malformed = String.raw`{"value":"\u12G4"}`;

    expect(unicode(literal)).toBe(literal);
    expect(unicode(malformed)).toBe(malformed);
  });
});
