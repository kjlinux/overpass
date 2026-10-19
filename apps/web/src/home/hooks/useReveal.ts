import type { RefObject } from "preact";
import { useEffect } from "preact/hooks";
import { onIdle, prefersReducedMotion } from "./idle";

/** Loads the reveal chunk when idle; content is never hidden before it runs. */
export function useReveal(root: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    let stop = (): void => undefined;
    let cancelled = false;
    const stopIdle = onIdle(() => {
      void import("../motion/reveal").then(({ revealSections }) => {
        const sections = [
          ...(root.current?.querySelectorAll<HTMLElement>(":scope > section") ?? []),
        ];
        if (!cancelled) stop = revealSections(sections);
      });
    });
    return () => {
      cancelled = true;
      stopIdle();
      stop();
    };
  }, [root]);
}
