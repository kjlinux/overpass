export type Block = Record<string, string> & { content: string };
export type Sections = { body: string; blocks: Block[] };

const header = /^@@ (.+) @@$/;

/** Reads `key=value` pairs; a bare word is a flag set to "true". */
function fieldsOf(line: string): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const token of line.split(/\s+/).filter((part) => part !== "")) {
    const equals = token.indexOf("=");
    const key = equals === -1 ? token : token.slice(0, equals);
    if (key in fields) throw new Error(`block field given twice: ${key}`);
    fields[key] = equals === -1 ? "true" : token.slice(equals + 1);
  }
  return fields;
}

/** Splits a Markdown body into its lead text and the `@@ ... @@` blocks that follow it. */
export function parseSections(text: string): Sections {
  const blocks: Block[] = [];
  const lead: string[] = [];
  let current: { fields: Record<string, string>; lines: string[] } | undefined;
  const close = () => {
    if (current !== undefined) {
      blocks.push({ ...current.fields, content: current.lines.join("\n").trim() });
    }
  };
  for (const line of text.split("\n")) {
    const match = header.exec(line.trim());
    if (match?.[1] !== undefined) {
      close();
      current = { fields: fieldsOf(match[1]), lines: [] };
    } else {
      (current?.lines ?? lead).push(line);
    }
  }
  close();
  return { body: lead.join("\n").trim(), blocks };
}
