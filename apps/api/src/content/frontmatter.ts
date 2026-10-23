export type Frontmatter = { fields: Record<string, string>; body: string };

const fence = "---";

function unquote(value: string): string {
  const trimmed = value.trim();
  const quoted = trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"');
  return quoted ? trimmed.slice(1, -1) : trimmed;
}

/** Reads the `key: value` block between two fences; the body is the rest, trimmed. */
export function parseFrontmatter(text: string): Frontmatter {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  if (lines[0]?.trim() !== fence) throw new Error("missing frontmatter block");
  const end = lines.indexOf(fence, 1);
  if (end === -1) throw new Error("unterminated frontmatter block");
  const fields: Record<string, string> = {};
  for (const line of lines.slice(1, end)) {
    if (line.trim() === "") continue;
    const colon = line.indexOf(":");
    if (colon === -1) throw new Error(`frontmatter line without a colon: ${line}`);
    fields[line.slice(0, colon).trim()] = unquote(line.slice(colon + 1));
  }
  return {
    fields,
    body: lines
      .slice(end + 1)
      .join("\n")
      .trim(),
  };
}
