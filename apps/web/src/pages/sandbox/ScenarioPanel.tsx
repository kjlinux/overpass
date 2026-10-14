import type { Scenario } from "@overpass/shared";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { RadioRow, Section } from "./parts";

type Props = {
  scenarios: readonly Scenario[];
  value: Scenario;
  onChange: (scenario: Scenario) => void;
  title?: string;
};

/** The five failures the test track can stage, each with what it does. */
export function ScenarioPanel({ scenarios, value, onChange, title }: Props): JSX.Element {
  const { t } = useTranslation("sandbox");
  const heading = title ?? t("scenario.heading");
  return (
    <Section id="sandbox-scenario" title={heading}>
      <div role="radiogroup" aria-labelledby="sandbox-scenario" class="border-t border-rule">
        {scenarios.map((scenario) => (
          <RadioRow
            key={scenario}
            name="scenario"
            value={scenario}
            checked={scenario === value}
            label={t(`scenario.${scenario}.label`)}
            help={t(`scenario.${scenario}.help`)}
            onChange={(next) => {
              onChange(next as Scenario);
            }}
          />
        ))}
      </div>
    </Section>
  );
}
