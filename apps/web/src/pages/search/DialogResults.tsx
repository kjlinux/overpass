import { searchKinds } from "@overpass/shared";
import type { Language, SearchHit } from "@overpass/shared";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { Skeleton, cx } from "../../components/ui";
import { HitContent } from "./HitContent";
import { hitHref } from "./query";
import type { Groups, Preview } from "./usePreview";

export const optionId = (listId: string, index: number) => `${listId}-option-${String(index)}`;

/** The hits in the order the arrows walk them: articles, discussions, then itineraries. */
export function flatHits(groups: Groups): SearchHit[] {
  return searchKinds.flatMap((kind) => groups[kind]?.items ?? []);
}

type ListProps = {
  listId: string;
  groups: Groups;
  active: number;
  language: Language;
  onPick: () => void;
};

type OptionProps = { id: string; hit: SearchHit; selected: boolean } & Pick<
  ListProps,
  "language" | "onPick"
>;

function HitOption({ id, hit, selected, language, onPick }: OptionProps): JSX.Element {
  return (
    <li id={id} role="option" aria-selected={selected}>
      <a
        href={hitHref(hit, language)}
        tabIndex={-1}
        onClick={onPick}
        class={cx(
          "block px-6 py-3 no-underline hover:bg-accent-surface",
          selected && "bg-accent-surface shadow-[inset_2px_0_0_var(--color-accent)]",
        )}
      >
        <HitContent hit={hit} />
      </a>
    </li>
  );
}

function HitList({ listId, groups, active, language, onPick }: ListProps): JSX.Element {
  const { t } = useTranslation("search");
  let index = -1;
  return (
    <ul id={listId} role="listbox" aria-label={t("dialog.label")} class="m-0 list-none p-0">
      {searchKinds.map((kind) => {
        const items = groups[kind]?.items ?? [];
        if (items.length === 0) return null;
        const headingId = `${listId}-${kind}`;
        return (
          <li key={kind} role="presentation" class="border-t border-rule first:border-t-0">
            <p id={headingId} class="m-0 px-6 pb-1 pt-4 text-caption font-semibold text-ink-2">
              {t(`kinds.${kind}`)}
            </p>
            <ul role="group" aria-labelledby={headingId} class="m-0 list-none p-0">
              {items.map((hit) => {
                index += 1;
                const id = optionId(listId, index);
                const props = { id, hit, selected: index === active, language, onPick };
                return <HitOption key={hit.id} {...props} />;
              })}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}

type Props = Omit<ListProps, "groups"> & { preview: Preview; q: string };

/** Hint before typing, a skeleton while waiting, then hits, nothing found, or an error. */
export function DialogResults({ preview, q, ...list }: Props): JSX.Element {
  const { t } = useTranslation("search");
  if (preview.status === "idle") return <p class="m-0 px-6 py-6 text-ink-2">{t("dialog.hint")}</p>;
  if (preview.status === "loading") {
    return (
      <div class="px-6 py-6">
        <Skeleton lines={4} title={false} />
      </div>
    );
  }
  if (preview.status === "error") {
    return (
      <p role="alert" class="m-0 px-6 py-6">
        {t("dialog.error")}
      </p>
    );
  }
  if (flatHits(preview.groups).length === 0) {
    return (
      <div class="px-6 py-6">
        <p class="m-0 font-semibold">{t("dialog.empty", { q: q.trim() })}</p>
        <p class="m-0 mt-2 text-ink-2">{t("dialog.emptyHelp")}</p>
      </div>
    );
  }
  return <HitList {...list} groups={preview.groups} />;
}
