// Copyright 2022-Present loggerhead.
// Modifications Copyright 2026 MrTanXin.
// SPDX-License-Identifier: Apache-2.0
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
const HEX_RE = /^[0-9a-fA-F]{4}$/;

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
  jsonc.parse(text, errors);
  return errors.length === 0;
}

/**
 * Removes one outer string-escaping layer when the input is an escaped JSON
 * document. Ordinary valid JSON is returned unchanged.
 */
export function autoUnescape(text: string): string {
  const errors: jsonc.ParseError[] = [];
  const value = jsonc.parse(text, errors);

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

function readUnicodeEscape(text: string, offset: number): { codeUnit: number; end: number } | undefined {
  if (text[offset] !== "\\" || text[offset + 1] !== "u") {
    return undefined;
  }

  const hex = text.slice(offset + 2, offset + 6);
  if (!HEX_RE.test(hex)) {
    return undefined;
  }

  return { codeUnit: Number.parseInt(hex, 16), end: offset + 6 };
}

/**
 * Decodes valid Unicode escape sequences while respecting escaped backslashes.
 * Unpaired surrogate code units and malformed sequences are kept unchanged.
 */
export function decodeUnicode(text: string): string {
  const normalized = text;
  let result = "";

  for (let index = 0; index < normalized.length; ) {
    if (normalized[index] !== "\\") {
      result += normalized[index++];
      continue;
    }

    const slashStart = index;
    while (normalized[index] === "\\") {
      index++;
    }

    const slashCount = index - slashStart;
    const escape = slashCount % 2 === 1 ? readUnicodeEscape(normalized, index - 1) : undefined;
    if (slashCount % 2 === 0 || !escape) {
      // An even number of slashes means the final slash is escaped and the
      // following text is literal. Malformed Unicode is preserved as-is.
      result += "\\".repeat(slashCount);
      continue;
    }

    // Keep the escaped backslash pairs and consume only the final slash as
    // the Unicode escape marker.
    result += "\\".repeat(slashCount - 1);

    if (escape.codeUnit >= 0xd800 && escape.codeUnit <= 0xdbff) {
      const nextEscape = readUnicodeEscape(normalized, escape.end);
      if (nextEscape && nextEscape.codeUnit >= 0xdc00 && nextEscape.codeUnit <= 0xdfff) {
        const codePoint = 0x10000 + ((escape.codeUnit - 0xd800) << 10) + (nextEscape.codeUnit - 0xdc00);
        result += String.fromCodePoint(codePoint);
        index = nextEscape.end;
        continue;
      }

      result += "\\" + normalized.slice(index, escape.end);
      index = escape.end;
      continue;
    }

    if (escape.codeUnit >= 0xdc00 && escape.codeUnit <= 0xdfff) {
      result += "\\" + normalized.slice(index, escape.end);
    } else {
      result += String.fromCharCode(escape.codeUnit);
    }
    index = escape.end;
  }

  return result;
}

/**
 * Removes one escaped JSON layer and decodes the Unicode escapes in it.
 */
export function unicode(text: string): string {
  return decodeUnicode(autoUnescape(text));
}
