import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { Button } from "../components/ui";
import { applyTheme, browserStorage, writeStoredTheme } from "./theme";
import type { Theme } from "./theme";
import { storedTheme, useTheme } from "./useTheme";

// Applied when the layout chunk loads, before the first render of the app.
if (typeof document !== "undefined") applyTheme(document.documentElement, storedTheme());

/** A plain text switch; the label names the theme it moves to. */
export function ThemeSwitch({ class: className }: { class?: string }): JSX.Element {
  const { t } = useTranslation("layout");
  const theme = useTheme();
  const toggle = (): void => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    applyTheme(document.documentElement, next);
    const storage = browserStorage();
    if (storage !== null) writeStoredTheme(storage, next);
  };
  return (
    <Button variant="ghost" class={className ?? "px-3"} onClick={toggle}>
      {theme === "dark" ? t("themeLight") : t("themeDark")}
    </Button>
  );
}
