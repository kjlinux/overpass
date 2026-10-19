import i18next from "i18next";
import type { FunctionComponent } from "preact";
import { useEffect, useState } from "preact/hooks";
import type { Language } from "@overpass/shared";
import { onIdle } from "./idle";

type BelowView = FunctionComponent<{ language: Language }>;

/** Loads the lower sections and their translations once the first screen is interactive. */
export function useBelow(): BelowView | null {
  const [view, setView] = useState<BelowView | null>(null);
  useEffect(() => {
    let live = true;
    const stop = onIdle(() => {
      const chunk = import("../Below");
      void Promise.all([chunk, i18next.loadNamespaces("home")]).then(([module]) => {
        if (live) setView(() => module.Below);
      });
    }, 500);
    return () => {
      live = false;
      stop();
    };
  }, []);
  return view;
}
