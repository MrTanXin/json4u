// Copyright 2026 MrTanXin.
// SPDX-License-Identifier: Apache-2.0
import * as jsonc from "jsonc-parser";
import Papa from "papaparse";

export type ArrayItemType = "number" | "string";

const JSON_NUMBER_RE = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?$/;
const THOUSANDS_RE = /^[+-]?\d{1,3}(,\d{3})+(\.\d+)?$/;
const FALLBACK_SEPARATOR_RE = /[,，]/;

function isValidJSON(text: string): boolean {
  const errors: jsonc.ParseError[] = [];
  jsonc.parse(text, errors);
  return errors.length === 0;
}

/**
 * Splits text copied from a spreadsheet into cells. Cells are separated by tabs
 * and rows by line breaks; quoted cells may contain line breaks. A single line
 * without tabs falls back to comma separation.
 */
export function splitCells(text: string): string[] {
  const trimmed = text.trim();
  const singleLine = !/[\t\r\n]/.test(trimmed);
  // A single cell such as "1,234" is a number with thousands separators.
  const delimiter = singleLine && FALLBACK_SEPARATOR_RE.test(trimmed) && !THOUSANDS_RE.test(trimmed) ? "," : "\t";
  const source = delimiter === "," ? text.replace(/，/g, ",") : text;

  const { data, errors } = Papa.parse<string[]>(source, { delimiter, skipEmptyLines: true });
  const rows = errors.length > 0 ? source.split(/\r?\n/).map((line) => line.split(delimiter)) : data;

  return rows
    .flat()
    .map((cell) => cell.trim())
    .filter((cell) => cell.length > 0);
}

/**
 * Converts a cell to a JSON number literal. The original digits are kept when
 * possible so that long IDs do not lose precision.
 */
function toNumberLiteral(cell: string): string | undefined {
  let s = cell.replace(/^\+/, "");
  if (THOUSANDS_RE.test(cell)) {
    s = s.replace(/,/g, "");
  }

  if (JSON_NUMBER_RE.test(s)) {
    return s;
  }

  const n = Number(s);
  return s !== "" && Number.isFinite(n) ? String(n) : undefined;
}

/**
 * Converts non-JSON text (e.g. cells copied from Excel) to a JSON array.
 * Returns the text unchanged if it is already valid JSON or looks like JSON.
 * In number mode, cells that are not numbers are kept as strings.
 */
export function toArray(text: string, type: ArrayItemType): string {
  const trimmed = text.trim();
  if (!trimmed || /^[{[]/.test(trimmed) || isValidJSON(text)) {
    return text;
  }

  const cells = splitCells(text);
  if (cells.length === 0) {
    return text;
  }

  const items = cells.map((cell) => (type === "number" && toNumberLiteral(cell)) || JSON.stringify(cell));
  return `[${items.join(",")}]`;
}
