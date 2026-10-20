import { useEffect } from "preact/hooks";

/** Pathname seen by the last mounted layout; undefined until the first page has rendered. */
let lastPath: string | undefined;

/** Only a new pathname moves focus: not the first load, nor a query or hash change. */
export function shouldFocusMain(previous: string | undefined, next: string): boolean {
  return previous !== undefined && previous !== next;
}

/** Forgets the last pathname, so a test starts from a first load. */
export function resetRouteFocus(): void {
  lastPath = undefined;
}

/** Moves focus to the main landmark after a client-side page change, without scrolling. */
export function useRouteFocus(mainId: string): void {
  useEffect(() => {
    const next = location.pathname;
    if (shouldFocusMain(lastPath, next)) {
      document.getElementById(mainId)?.focus({ preventScroll: true });
    }
    lastPath = next;
  }, [mainId]);
}
