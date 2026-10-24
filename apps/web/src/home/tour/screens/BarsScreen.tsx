import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { Screen } from "../Screen";
import { useSequence } from "../useSequence";

type Bar = { label: string; value: number; unit: string };

/** Bars that grow to their value, for points earned and votes cast. */
export function BarsScreen({ block }: { block: string }): JSX.Element {
  const { t } = useTranslation("home");
  const bars = t(`tour.${block}.screen.bars`, { returnObjects: true }) as Bar[];
  const { ref, step } = useSequence(bars.length);
  const max = Math.max(...bars.map((bar) => bar.value), 1);
  return (
    <Screen
      title={t(`tour.${block}.screen.title`)}
      label={t(`tour.${block}.screen.label`)}
      screenRef={ref}
    >
      <ul class="m-0 grid list-none gap-3 p-0">
        {bars.map((bar, index) => (
          <li key={bar.label} class="grid gap-1">
            <span class="flex justify-between gap-4 text-caption">
              <span class="truncate">{bar.label}</span>
              <span class="font-code text-ink-2">{`${String(bar.value)} ${bar.unit}`}</span>
            </span>
            <span class="tour-track">
              <span
                class="tour-bar"
                style={{ width: index < step ? `${String((bar.value / max) * 100)}%` : "0%" }}
              />
            </span>
          </li>
        ))}
      </ul>
    </Screen>
  );
}
