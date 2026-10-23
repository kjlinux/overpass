export type Frontmatter = { fields: Record<string, string>; body: string };

const fence = "---";

function unquote(value: string): string {
  const trimmed = value.trim();
  const quoted = trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"');
  return quoted ? trimmed.slice(1, -1) : trimmed;
}

function fieldsOf(lines: string[]): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const line of lines) {
    if (line.trim() === "") continue;
    const colon = line.indexOf(":");
    if (colon === -1) throw new Error(`frontmatter line without a colon: ${line}`);
    const key = line.slice(0, colon).trim();
    if (key in fields) throw new Error(`frontmatter key given twice: ${key}`);
    fields[key] = unquote(line.slice(colon + 1));
  }
  return fields;
}

/** Reads the `key: value` block between two fences; the body is the rest, trimmed. */
export function parseFrontmatter(text: string): Frontmatter {
  // Editors on Windows add a byte order mark and CRLF endings; neither carries meaning here.
  const lines = stripBom(text).replace(/\r\n/g, "\n").split("\n");
  if (lines[0]?.trim() !== fence) throw new Error("missing frontmatter block");
  const end = lines.findIndex((line, index) => index > 0 && line.trim() === fence);
  if (end === -1) throw new Error("unterminated frontmatter block");
  return {
    fields: fieldsOf(lines.slice(1, end)),
    body: lines
      .slice(end + 1)
      .join("\n")
      .trim(),
  };
}

function stripBom(text: string): string {
  const bom = String.fromCharCode(0xfeff);
  return text.startsWith(bom) ? text.slice(1) : text;
}
