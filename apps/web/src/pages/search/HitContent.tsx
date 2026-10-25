import { languageNames, splitHighlights } from "@overpass/shared";
import type { SearchHit } from "@overpass/shared";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";

/** Matched words get a mark; every part is text, so a snippet can never inject markup. */
export function Highlighted({ text }: { text: string }): JSX.Element {
  return (
    <>
      {splitHighlights(text).map((part, index) =>
        part.hit ? (
          <mark key={index} class="bg-accent-surface px-0.5 text-ink">
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </>
  );
}

/** Title, two lines of snippet, then the kind and the language of the content. */
export function HitContent({ hit }: { hit: SearchHit }): JSX.Element {
  const { t } = useTranslation("search");
  return (
    <span class="flex min-w-0 flex-col gap-1">
      <span class="font-semibold text-ink [overflow-wrap:anywhere]">{hit.title}</span>
      <span class="line-clamp-2 text-ink-2">
        <Highlighted text={hit.snippet} />
      </span>
      <span class="flex flex-wrap gap-x-4 text-caption text-ink-2">
        <span>{t(`kinds.${hit.kind}`)}</span>
        <span lang={hit.language}>{languageNames[hit.language]}</span>
      </span>
    </span>
  );
}
