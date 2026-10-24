import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { Line, Screen } from "../Screen";
import type { Tone } from "../Screen";
import { useSequence } from "../useSequence";

type Scenario = { name: string; result: string; tone: Tone };

/** The scenarios of a test key, played in turn, each with what the simulator sends back. */
export function TrackScreen(): JSX.Element {
  const { t } = useTranslation("home");
  const scenarios = t("tour.track.screen.scenarios", { returnObjects: true }) as Scenario[];
  const { ref, step } = useSequence(scenarios.length);
  const active = Math.max(0, Math.min(step, scenarios.length) - 1);
  return (
    <Screen
      title={t("tour.track.screen.title")}
      label={t("tour.track.screen.label")}
      screenRef={ref}
    >
      <ul class="m-0 grid list-none gap-1 p-0">
        {scenarios.map((scenario, index) => (
          <li key={scenario.name} class="tour-row" data-active={index === active ? "" : undefined}>
            <span>{scenario.name}</span>
            {index === active ? (
              <Line tone={scenario.tone} on>
                {scenario.result}
              </Line>
            ) : null}
          </li>
        ))}
      </ul>
    </Screen>
  );
}
