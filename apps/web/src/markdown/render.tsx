import { h } from "preact";
import type { ComponentChildren, JSX } from "preact";
import { CodeBlock, InlineCode } from "../components/ui";
import { safeHref, safeImageSrc } from "./links";
import { anchorOf, textOf } from "./parse";
import type { MarkdownNode } from "./parse";

type Tag = string;

/** The only containers rendered; any other token type keeps its text and loses its tag. */
const containers: Record<string, Tag> = {
  paragraph_open: "p",
  bullet_list_open: "ul",
  list_item_open: "li",
  blockquote_open: "blockquote",
  table_open: "table",
  thead_open: "thead",
  tbody_open: "tbody",
  tr_open: "tr",
  th_open: "th",
  td_open: "td",
  strong_open: "strong",
  em_open: "em",
  s_open: "s",
};

const languagePattern = /^[\w+#.-]{1,20}$/;

export function renderAll(nodes: MarkdownNode[]): ComponentChildren[] {
  return nodes.map((node, index) => renderNode(node, index));
}

function renderCode({ token }: MarkdownNode, key: number): JSX.Element {
  const language = token.info.trim().split(/\s+/)[0] ?? "";
  const code = token.content.replace(/\n$/, "");
  return languagePattern.test(language) ? (
    <CodeBlock key={key} code={code} language={language} />
  ) : (
    <CodeBlock key={key} code={code} />
  );
}

/** Page titles are h1, so member headings start at h2 and stop at h4. */
function renderHeading({ token, children }: MarkdownNode, key: number): JSX.Element {
  const level = Math.min(4, Math.max(2, Number(token.tag.slice(1))));
  const id = anchorOf(textOf(children));
  return h(`h${String(level)}`, { id, key }, renderAll(children));
}

function renderLink({ token, children }: MarkdownNode, key: number): JSX.Element {
  const href = safeHref(token.attrGet("href") ?? "");
  if (href === undefined) return <span key={key}>{renderAll(children)}</span>;
  return (
    <a key={key} href={href} rel="noopener noreferrer nofollow">
      {renderAll(children)}
    </a>
  );
}

function renderImage({ token, children }: MarkdownNode, key: number): ComponentChildren {
  const alt = textOf(children) || token.content;
  const src = safeImageSrc(token.attrGet("src") ?? "");
  if (src === undefined) return alt;
  return (
    <img key={key} src={src} alt={alt} loading="lazy" decoding="async" class="markdown-image" />
  );
}

function renderLeaf(node: MarkdownNode, key: number): ComponentChildren {
  const { token, children } = node;
  switch (token.type) {
    case "text":
      return token.content;
    case "code_inline":
      return <InlineCode key={key}>{token.content}</InlineCode>;
    case "softbreak":
      return "\n";
    case "hardbreak":
      return <br key={key} />;
    case "hr":
      return <hr key={key} />;
    case "image":
      return renderImage(node, key);
    case "fence":
    case "code_block":
      return renderCode(node, key);
    default:
      return renderAll(children);
  }
}

function renderNode(node: MarkdownNode, key: number): ComponentChildren {
  const { token, children } = node;
  if (token.type === "paragraph_open" && token.hidden) return renderAll(children);
  if (token.type === "heading_open") return renderHeading(node, key);
  if (token.type === "link_open") return renderLink(node, key);
  if (token.type === "ordered_list_open") {
    const start = Number(token.attrGet("start") ?? 1);
    return (
      <ol key={key} start={start}>
        {renderAll(children)}
      </ol>
    );
  }
  const Container = containers[token.type];
  if (Container !== undefined) return h(Container, { key }, renderAll(children));
  return renderLeaf(node, key);
}
