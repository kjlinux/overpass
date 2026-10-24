import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { Line, Screen } from "../Screen";
import type { Tone } from "../Screen";
import { useSequence } from "../useSequence";

type ScreenLine = { tone: Tone; text: string };

/** Lines written one after the other, the way the feature unfolds for real. */
export function LineScreen({ block }: { block: string }): JSX.Element {
  const { t } = useTranslation("home");
  const lines = t(`tour.${block}.screen.lines`, {
    returnObjects: true,
    origin: window.location.origin,
  }) as ScreenLine[];
  const { ref, step } = useSequence(lines.length);
  return (
    <Screen
      title={t(`tour.${block}.screen.title`)}
      label={t(`tour.${block}.screen.label`)}
      screenRef={ref}
    >
      {lines.map((line, index) => (
        <Line key={index} tone={line.tone} on={index < step}>
          {line.text}
        </Line>
      ))}
    </Screen>
  );
}
