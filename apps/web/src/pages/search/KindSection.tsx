import type { Language, SearchGroup, SearchHit, SearchKind } from "@overpass/shared";
import type { JSX } from "preact";
import { useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui";
import { apiRequest } from "../../session";
import { HitContent } from "./HitContent";
import { hitHref, searchApiPath } from "./query";
import type { SearchParams } from "./query";

export const pageSize = 10;

type Props = { kind: SearchKind; first: SearchGroup; params: SearchParams; language: Language };

/** Later pages of one kind, fetched with the cursor of the page before. */
function useMore(kind: SearchKind, first: SearchGroup, params: SearchParams, language: Language) {
  const [items, setItems] = useState<SearchHit[]>(first.items);
  const [cursor, setCursor] = useState(first.nextCursor);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const more = async () => {
    if (cursor === null) return;
    setBusy(true);
    const path = searchApiPath({ ...params, kind }, language, { cursor, limit: pageSize });
    const result = await apiRequest<Partial<Record<SearchKind, SearchGroup>>>("GET", path);
    const next = result.error === null ? result.data[kind] : undefined;
    setFailed(next === undefined);
    if (next !== undefined) {
      setItems([...items, ...next.items]);
      setCursor(next.nextCursor);
    }
    setBusy(false);
  };
  return { items, cursor, busy, failed, more };
}

/** One ruled section per kind, its hits as links, and a button for the next page. */
export function KindSection({ kind, first, params, language }: Props): JSX.Element {
  const { t } = useTranslation("search");
  const { items, cursor, busy, failed, more } = useMore(kind, first, params, language);
  return (
    <section class="border-t border-rule pt-6" aria-labelledby={`search-${kind}`}>
      <h2 id={`search-${kind}`} class="m-0 text-h2 font-semibold">
        {t(`kinds.${kind}`)}
      </h2>
      <ul class="m-0 mt-4 list-none p-0">
        {items.map((hit) => (
          <li key={hit.id} class="border-b border-rule last:border-b-0">
            <a
              href={hitHref(hit, language)}
              class="block py-4 no-underline hover:bg-accent-surface"
            >
              <HitContent hit={hit} />
            </a>
          </li>
        ))}
      </ul>
      {failed ? (
        <p role="alert" class="m-0 mt-4 text-danger">
          {t("page.moreError")}
        </p>
      ) : null}
      {cursor === null ? null : (
        <Button class="mt-4" loading={busy} onClick={() => void more()}>
          {t("page.more")}
        </Button>
      )}
    </section>
  );
}
