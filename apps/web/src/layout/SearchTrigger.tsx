import type { Language } from "@overpass/shared";
import i18next from "i18next";
import { Search } from "lucide-preact";
import type { FunctionComponent, JSX } from "preact";
import { useEffect, useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { Button } from "../components/ui";
import type { SearchDialogProps } from "../pages/search";
import { isSearchShortcut } from "../pages/search/query";

type Dialog = FunctionComponent<SearchDialogProps>;

const shortcuts = "/ Control+K Meta+K";

/** The dialog and its translations load on first use, so they never weigh on a page load. */
async function loadDialog(): Promise<Dialog> {
  const [module] = await Promise.all([import("../pages/search"), i18next.loadNamespaces("search")]);
  return module.SearchDialog;
}

function typingIn(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

/** Listens for the search shortcut while the dialog is closed. */
function useShortcut(enabled: boolean, show: () => void): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const { key, ctrlKey, metaKey, altKey } = event;
      const typing = typingIn(event.target);
      if (!enabled || !isSearchShortcut({ key, ctrlKey, metaKey, altKey, typing })) return;
      event.preventDefault();
      show();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  });
}

/** Header button for the global search; slash outside a field, Ctrl+K or Cmd+K anywhere. */
export function SearchTrigger({ language }: { language: Language }): JSX.Element {
  const { t } = useTranslation("layout");
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<{ Component: Dialog } | null>(null);
  const show = () => {
    setOpen(true);
    if (dialog === null)
      void loadDialog().then((Component) => {
        setDialog({ Component });
      });
  };
  useShortcut(!open, show);
  const Component = dialog?.Component;
  return (
    <>
      <Button aria-haspopup="dialog" aria-keyshortcuts={shortcuts} onClick={show}>
        <Search size={20} strokeWidth={1.75} aria-hidden="true" />
        <span class="sr-only md:not-sr-only">{t("search")}</span>
        <kbd class="hidden border border-rule px-1.5 font-mono text-caption text-ink-2 lg:inline">
          {t("searchKey")}
        </kbd>
      </Button>
      {Component === undefined ? null : (
        <Component
          open={open}
          language={language}
          onClose={() => {
            setOpen(false);
          }}
        />
      )}
    </>
  );
}
