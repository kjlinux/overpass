import MarkdownIt from "markdown-it";

/** Raw HTML is off, so markup typed by a member always reaches the page as text. */
const parser = new MarkdownIt({ html: false, linkify: false, typographer: false });

export type Token = ReturnType<MarkdownIt["parse"]>[number];
export type MarkdownNode = { token: Token; children: MarkdownNode[] };

/** Nests the flat open, close and inline tokens into a tree. */
function nest(tokens: Token[]): MarkdownNode[] {
  const root: MarkdownNode[] = [];
  const stack: MarkdownNode[][] = [root];
  for (const token of tokens) {
    const current = stack[stack.length - 1] ?? root;
    if (token.nesting === 1) {
      const node: MarkdownNode = { token, children: [] };
      current.push(node);
      stack.push(node.children);
    } else if (token.nesting === -1) {
      stack.pop();
    } else {
      current.push({ token, children: nest(token.children ?? []) });
    }
  }
  return root;
}

export function parseMarkdown(source: string): MarkdownNode[] {
  return nest(parser.parse(source, {}));
}

/** A readable anchor: no accents, lower case, words joined by hyphens. */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Plain text of an inline node, for anchors and alternative text. */
export function textOf(nodes: MarkdownNode[]): string {
  return nodes
    .map(({ token, children }) =>
      token.type === "text" || token.type === "code_inline" ? token.content : textOf(children),
    )
    .join("");
}

/** Section headings (levels one and two), as the table of contents shows them. */
export function headingsOf(source: string): { id: string; text: string }[] {
  return parseMarkdown(source)
    .filter(({ token }) => token.type === "heading_open" && ["h1", "h2"].includes(token.tag))
    .map(({ children }) => textOf(children))
    .map((text) => ({ id: slugify(text), text }));
}
