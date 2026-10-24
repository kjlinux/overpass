import type { ComponentChildren, JSX } from "preact";
import { useTranslation } from "react-i18next";
import { cx } from "./cx";

export type RouteStatus = "clear" | "toVerify" | "broken";

const tones: Record<RouteStatus, string> = {
  clear: "text-success",
  toVerify: "text-warning",
  broken: "text-danger",
};

/** The state of an itinerary as coloured words only, no box: the text carries the meaning. */
export function StatusBadge({ status }: { status: RouteStatus }): JSX.Element {
  const { t } = useTranslation("ui");
  return (
    <span
      class={cx(
        "inline-flex items-center whitespace-nowrap text-caption font-semibold",
        tones[status],
      )}
    >
      {t(`status.${status}`)}
    </span>
  );
}

export type ChipProps = { selected?: boolean; children: ComponentChildren };

/** A neutral label for stacks, countries, filters and the unofficial mention. */
export function Chip({ selected = false, children }: ChipProps): JSX.Element {
  return (
    <span
      class={cx(
        "inline-flex min-h-7 items-center whitespace-nowrap border px-3 text-caption font-medium",
        selected ? "border-accent bg-accent-surface text-ink" : "border-rule-strong text-ink-2",
      )}
    >
      {children}
    </span>
  );
}
