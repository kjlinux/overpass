import type { Language } from "@overpass/shared";
import { X } from "lucide-preact";
import type { JSX } from "preact";
import { useLocation } from "preact-iso";
import { useEffect, useId, useRef, useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { IconButton } from "../../components/ui";
import { DialogResults, flatHits, optionId } from "./DialogResults";
import { hitHref, nextActive, searchPagePath } from "./query";
import { minLength, usePreview } from "./usePreview";

export type SearchDialogProps = { open: boolean; language: Language; onClose: () => void };

/** Opens or closes the native dialog as a modal whenever `open` changes. */
function useModal(open: boolean) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog === null) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return ref;
}

/** The arrows walk the hits, Enter opens the active one or the full results page. */
function useKeys(q: string, language: Language, onClose: () => void) {
  const { route } = useLocation();
  const preview = usePreview(q, language);
  const [active, setActive] = useState(-1);
  useEffect(() => {
    setActive(-1);
  }, [preview]);
  const hits = preview.status === "ready" ? flatHits(preview.groups) : [];
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setActive(nextActive(active, hits.length, event.key));
      return;
    }
    if (event.key !== "Enter" || q.trim().length < minLength) return;
    event.preventDefault();
    const hit = hits[active];
    route(hit === undefined ? searchPagePath(language, { q: q.trim() }) : hitHref(hit, language));
    onClose();
  };
  return { preview, active, hits, onKeyDown };
}

type FieldProps = {
  q: string;
  setQ: (value: string) => void;
  listId: string;
  active: number;
  expanded: boolean;
  onKeyDown: (event: KeyboardEvent) => void;
};

function SearchField({ q, setQ, listId, active, expanded, onKeyDown }: FieldProps): JSX.Element {
  const { t } = useTranslation("search");
  return (
    <input
      type="search"
      role="combobox"
      list={undefined}
      autoFocus
      aria-label={t("dialog.label")}
      aria-expanded={expanded}
      aria-controls={listId}
      aria-autocomplete="list"
      aria-activedescendant={active >= 0 ? optionId(listId, active) : undefined}
      value={q}
      onInput={(event) => {
        setQ(event.currentTarget.value);
      }}
      onKeyDown={onKeyDown}
      class="min-h-tap w-full border border-rule-strong bg-paper px-3 text-ink"
    />
  );
}

/** The way out of the preview to every result, once there is something to search for. */
function SeeAll({ q, language, onClose }: { q: string; language: Language; onClose: () => void }) {
  const { t } = useTranslation("search");
  const query = q.trim();
  if (query.length < minLength) return null;
  return (
    <a
      href={searchPagePath(language, { q: query })}
      onClick={onClose}
      class="block border-t border-rule px-6 py-4 font-semibold"
    >
      {t("dialog.seeAll", { q: query })}
    </a>
  );
}

/** A modal search box: results while typing, grouped by kind, and a link to every result. */
export function SearchDialog({ open, language, onClose }: SearchDialogProps): JSX.Element {
  const { t } = useTranslation("search");
  const ref = useModal(open);
  const id = useId();
  const listId = `${id}-list`;
  const [q, setQ] = useState("");
  const { preview, active, hits, onKeyDown } = useKeys(q, language, onClose);
  const ready = preview.status === "ready";
  return (
    <dialog
      ref={ref}
      aria-labelledby={`${id}-title`}
      onClose={onClose}
      class="fade-in m-0 mx-auto mt-4 flex max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] max-w-[640px] flex-col border border-rule-strong bg-raised p-0 text-ink shadow-raised backdrop:bg-ink/40 md:mt-[10vh] md:max-h-[80vh] [&:not([open])]:hidden"
    >
      <div class="flex items-center justify-between gap-4 border-b border-rule px-6 pt-4">
        <h2 id={`${id}-title`} class="m-0 text-h3 font-semibold">
          {t("dialog.title")}
        </h2>
        <IconButton label={t("dialog.close")} onClick={onClose}>
          <X size={20} strokeWidth={1.75} aria-hidden="true" />
        </IconButton>
      </div>
      <div class="border-b border-rule px-6 py-4">
        <SearchField
          {...{ q, setQ, listId, active, onKeyDown }}
          expanded={ready && hits.length > 0}
        />
      </div>
      <div class="min-h-0 flex-1 overflow-y-auto">
        <DialogResults {...{ preview, q, listId, active, language }} onPick={onClose} />
      </div>
      <p aria-live="polite" class="sr-only">
        {ready ? t("dialog.results", { count: hits.length }) : ""}
      </p>
      <SeeAll q={q} language={language} onClose={onClose} />
    </dialog>
  );
}
