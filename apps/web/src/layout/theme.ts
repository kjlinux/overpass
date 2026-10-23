export type Theme = "light" | "dark";
export type ThemeStorage = Pick<Storage, "getItem" | "setItem">;

/** Same key as the inline script that applies the theme before first paint. */
export const themeKey = "overpass-theme";

export function parseTheme(value: string | null): Theme {
  return value === "light" ? "light" : "dark";
}

/** Reads the viewer's choice; blocked storage (private window, previews) means dark. */
export function readStoredTheme(storage: ThemeStorage): Theme {
  try {
    return parseTheme(storage.getItem(themeKey));
  } catch {
    return "dark";
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
