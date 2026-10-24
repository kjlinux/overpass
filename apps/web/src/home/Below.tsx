import type { Language } from "@overpass/shared";
import type { JSX } from "preact";
import { useRef } from "preact/hooks";
import { CountriesSection } from "./CountriesSection";
import { FeaturesSection } from "./features/FeaturesSection";
import { useReveal } from "./hooks/useReveal";
import { LatestActivity } from "./latest/LatestActivity";
import { LatestRoutes } from "./latest/LatestRoutes";
import { McpSection } from "./McpSection";
import { TrackSection } from "./TrackSection";

/** The sections under the demo, in their own chunk so the first load stays within budget. */
export function Below({ language }: { language: Language }): JSX.Element {
  const root = useRef<HTMLDivElement>(null);
  useReveal(root);
  return (
    <div ref={root}>
      <FeaturesSection language={language} />
      <LatestRoutes language={language} />
      <TrackSection language={language} />
      <McpSection language={language} />
      <LatestActivity language={language} />
      <CountriesSection language={language} />
    </div>
  );
}
