import type { ComponentChildren, JSX } from "preact";
import { useTranslation } from "react-i18next";
import { cx } from "./cx";

export type RouteStatus = "clear" | "toVerify" | "broken";

const tones: Record<RouteStatus, string> = {
  clear: "border-success bg-success-surface text-success",
  toVerify: "border-warning bg-warning-surface text-warning",
  broken: "border-danger bg-danger-surface text-danger",
};

/** The state of an itinerary, with text that carries the meaning. */
export function StatusBadge({ status }: { status: RouteStatus }): JSX.Element {
  const { t } = useTranslation("ui");
  return (
    <span
      class={cx(
        "badge inline-flex min-h-7 items-center gap-2 whitespace-nowrap border px-2 text-caption font-medium",
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
