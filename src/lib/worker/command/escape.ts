import * as jsonc from "jsonc-parser";

const ESCAPE_MAP: Record<string, string> = {
  "\\": "\\\\",
  '"': '\\"',
  "\b": "\\b",
  "\f": "\\f",
  "\n": "\\n",
  "\r": "\\r",
  "\t": "\\t",
};

const UNESCAPE_MAP: Record<string, string> = {
  b: "\b",
  f: "\f",
  n: "\n",
  r: "\r",
  t: "\t",
  '"': '"',
  "\\": "\\",
  "/": "/",
};

const ESCAPE_RE = /[\\"\u0000-\u001F\/]/g;
const UNESCAPE_RE = /(\\+)(.)/g;

export function escape(text: string): string {
  return text.replace(ESCAPE_RE, (ch) => ESCAPE_MAP[ch] || ch);
}

export function unescape(text: string): string {
  return text.replace(UNESCAPE_RE, (_m, bs, c) => {
    const cnt = bs.length,
      half = cnt >> 1;
    const prefix = "\\".repeat(half);
    return cnt % 2 === 1 && UNESCAPE_MAP[c] !== undefined
      ? prefix + UNESCAPE_MAP[c]
      : prefix + (cnt % 2 ? "\\" : "") + c;
  });
}

function isValidJSON(text: string): boolean {
  const errors: jsonc.ParseError[] = [];
  jsonc.parse(text, undefined, errors);
  return errors.length === 0;
}

/**
 * Removes one outer string-escaping layer when the input is an escaped JSON
 * document. Ordinary valid JSON is returned unchanged.
 */
export function autoUnescape(text: string): string {
  const errors: jsonc.ParseError[] = [];
  const value = jsonc.parse(text, undefined, errors);

  // A JSON string containing another JSON document, e.g.
  // "{\"field\":\"value\"}".
  if (errors.length === 0 && typeof value === "string" && isValidJSON(value)) {
    return value;
  }

  // An escaped JSON document without an outer pair of quotes, e.g.
  // {\"field\":\"value\"}.
  if (errors.length > 0) {
    const unescaped = unescape(text);
    if (unescaped !== text && isValidJSON(unescaped)) {
      return unescaped;
    }
  }

  return text;
}
