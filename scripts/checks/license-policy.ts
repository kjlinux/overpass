export const allowedLicenses: ReadonlySet<string> = new Set([
  "MIT",
  "MIT-0",
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "0BSD",
  "ISC",
  "PostgreSQL",
  "BlueOak-1.0.0",
  "Python-2.0",
  "CC0-1.0",
  "Unlicense",
  "Zlib",
]);

type Cursor = { tokens: string[]; index: number };

function parsePrimary(cursor: Cursor): boolean {
  const token = cursor.tokens[cursor.index++];
  if (token === "(") {
    const value = parseOr(cursor);
    cursor.index++;
    return value;
  }
  return token !== undefined && allowedLicenses.has(token);
}

function parseAnd(cursor: Cursor): boolean {
  let value = parsePrimary(cursor);
  while (cursor.tokens[cursor.index] === "AND") {
    cursor.index++;
    value = parsePrimary(cursor) && value;
  }
  return value;
}

function parseOr(cursor: Cursor): boolean {
  let value = parseAnd(cursor);
  while (cursor.tokens[cursor.index] === "OR") {
    cursor.index++;
    value = parseAnd(cursor) || value;
  }
  return value;
}

/** Tells whether an SPDX expression is satisfied by the allow list. */
export function isAllowed(expression: string): boolean {
  const tokens = expression
    .replace(/([()])/g, " $1 ")
    .trim()
    .split(/\s+/);
  if (tokens.includes("WITH")) return false;
  const cursor = { tokens, index: 0 };
  const value = parseOr(cursor);
  return cursor.index === tokens.length && value;
}
