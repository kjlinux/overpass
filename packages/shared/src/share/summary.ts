const fence = /^(`{3,}|~{3,})/;

/** Inline Markdown reduced to its readable text. */
function stripInline(text: string): string {
  return text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]*>/g, "")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/(\*\*|__|\*|_|~~)(\S(?:.*?\S)?)\1/g, "$2")
    .replace(/\s+/g, " ")
    .trim();
}

/** Block markers (quote, list, heading) dropped from one line. */
function stripLine(line: string): string {
  return line.replace(/^\s*(>\s*)*/, "").replace(/^\s*([-*+]|\d+[.)])\s+/, "");
}

/** Paragraphs of a Markdown text, outside code blocks, headings and rules. */
function paragraphs(markdown: string): string[] {
  const found: string[] = [];
  let current: string[] = [];
  let inCode = false;
  const flush = () => {
    if (current.length > 0) found.push(current.join(" "));
    current = [];
  };
  for (const raw of markdown.split(/\r?\n/)) {
    if (fence.test(raw.trim())) {
      inCode = !inCode;
      flush();
      continue;
    }
    const line = stripLine(raw).trim();
    if (inCode || line === "" || /^#{1,6}\s/.test(line) || /^([-*_]\s*){3,}$/.test(line)) {
      flush();
      continue;
    }
    current.push(line);
  }
  flush();
  return found;
}

/** Cuts on a word boundary, counting graphemes so an emoji is never split. */
function cut(text: string, max: number): string {
  const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  const characters = Array.from(segmenter.segment(text), (part) => part.segment);
  if (characters.length <= max) return text;
  const head = characters.slice(0, max - 1).join("");
  const space = head.lastIndexOf(" ");
  return `${(space > 0 ? head.slice(0, space) : head).trimEnd()}…`;
}

/** The first readable paragraph of a Markdown text, as plain text of at most max characters. */
export function plainSummary(markdown: string, max = 160): string {
  const first = paragraphs(markdown)
    .map(stripInline)
    .find((text) => text !== "");
  return cut(first ?? "", max);
}
