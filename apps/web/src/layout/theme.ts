export type Theme = "light" | "dark";
export type ThemeStorage = Pick<Storage, "getItem" | "setItem">;

/** Same key as the inline script that applies the theme before first paint. */
export const themeKey = "overpass-theme";

export function parseTheme(value: string | null): Theme {
  return value === "dark" ? "dark" : "light";
}

/** Reads the viewer's choice; no choice or blocked storage (private window, previews) means light. */
export function readStoredTheme(storage: ThemeStorage): Theme {
  try {
    return parseTheme(storage.getItem(themeKey));
  } catch {
    return "light";
  }
}

export function writeStoredTheme(storage: ThemeStorage, theme: Theme): void {
  try {
    storage.setItem(themeKey, theme);
  } catch {
    // The choice still applies to this visit; only remembering it is lost.
  }
}

/** Sets or clears data-theme on the root element; light is the attribute-free theme. */
export function applyTheme(root: HTMLElement, theme: Theme): void {
  if (theme === "dark") root.setAttribute("data-theme", "dark");
  else root.removeAttribute("data-theme");
}

/** localStorage, or null where merely touching it throws (blocked site data). */
export function browserStorage(): ThemeStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
