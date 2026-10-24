import type { Language } from "@overpass/shared";
import type { JSX } from "preact";
import { useRef } from "preact/hooks";
import { CountriesSection } from "./CountriesSection";
import { useReveal } from "./hooks/useReveal";
import { LatestActivity } from "./latest/LatestActivity";
import { LatestRoutes } from "./latest/LatestRoutes";
import { Tour } from "./tour/Tour";

/** The sections under the demo, in their own chunk so the first load stays within budget. */
export function Below({ language }: { language: Language }): JSX.Element {
  const root = useRef<HTMLDivElement>(null);
  useReveal(root);
  return (
    <div ref={root}>
      <Tour language={language} />
      <LatestRoutes language={language} />
      <LatestActivity language={language} />
      <CountriesSection language={language} />
    </div>
  );
}
