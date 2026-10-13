import type { JSX } from "preact";
import { useMemo } from "preact/hooks";
import { parseMarkdown } from "./parse";
import { renderAll } from "./render";

/** Member Markdown rendered as components, never as HTML strings. */
export function Markdown({ source }: { source: string }): JSX.Element {
  const tree = useMemo(() => parseMarkdown(source), [source]);
  return <div class="markdown">{renderAll(tree)}</div>;
}
