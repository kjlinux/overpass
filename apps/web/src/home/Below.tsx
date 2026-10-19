import type { Language } from "@overpass/shared";
import type { JSX } from "preact";
import { useRef } from "preact/hooks";
import { CommunitySection } from "./CommunitySection";
import { CountriesSection } from "./CountriesSection";
import { useReveal } from "./hooks/useReveal";
import { McpSection } from "./McpSection";
import { RoutesSection } from "./RoutesSection";
import { TrackSection } from "./TrackSection";

/** The sections under the demo, in their own chunk so the first load stays within budget. */
export function Below({ language }: { language: Language }): JSX.Element {
  const root = useRef<HTMLDivElement>(null);
  useReveal(root);
  return (
    <div ref={root}>
      <TrackSection language={language} />
      <RoutesSection language={language} />
      <McpSection language={language} />
      <CommunitySection language={language} />
      <CountriesSection language={language} />
    </div>
  );
}
