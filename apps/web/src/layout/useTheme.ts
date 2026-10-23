import { useEffect, useState } from "preact/hooks";
import { browserStorage, readStoredTheme } from "./theme";
import type { Theme } from "./theme";

/** The viewer's stored choice, dark where storage is unavailable or on the server. */
export const storedTheme = (): Theme => {
  const storage = typeof window === "undefined" ? null : browserStorage();
  return storage === null ? "dark" : readStoredTheme(storage);
};

const shownTheme = (): Theme =>
  document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";

/** The one observer of data-theme: the switches, the captures and the scene all follow it. */
export function useTheme(): Theme {
  const [theme, setTheme] = useState<Theme>(storedTheme);
  useEffect(() => {
    setTheme(shownTheme());
    const observer = new MutationObserver(() => {
      setTheme(shownTheme());
    });
    observer.observe(document.documentElement, { attributeFilter: ["data-theme"] });
    return () => {
      observer.disconnect();
    };
  }, []);
  return theme;
}
