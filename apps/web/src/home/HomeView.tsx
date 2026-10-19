import "./home.css";
import type { Language } from "@overpass/shared";
import type { JSX } from "preact";
import { useState } from "preact/hooks";
import { DemoSection } from "./demo/DemoSection";
import { Hero } from "./Hero";
import { prefersReducedMotion } from "./hooks/idle";
import { useBelow } from "./hooks/useBelow";
import { SceneBand } from "./SceneBand";

/** The home page, proposal B: promise, scene band, then ruled sections in the imposed order. */
export function HomeView({ language }: { language: Language }): JSX.Element {
  const [focusRequest, setFocusRequest] = useState(0);
  const Below = useBelow();
  const tryDemo = (): void => {
    const behavior = prefersReducedMotion() ? "auto" : "smooth";
    document.getElementById("demo")?.scrollIntoView({ behavior, block: "start" });
    setFocusRequest((count) => count + 1);
  };
  return (
    <div class="pb-16 md:pb-24">
      <Hero language={language} onTry={tryDemo} />
      <SceneBand />
      <DemoSection language={language} focusRequest={focusRequest} />
      {Below === null ? (
        <div class="min-h-screen" aria-busy="true" />
      ) : (
        <Below language={language} />
      )}
    </div>
  );
}
