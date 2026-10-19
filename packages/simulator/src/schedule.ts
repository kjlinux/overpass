import type { ProviderEvent, Scenario } from "./contract.js";

export type DeliveryTiming = { duplicateGapMs: number; lateMs: number };

export type ScheduledWebhook = { event: ProviderEvent; delayMs: number };

/** Short enough for the public demo to show both copies of a duplicate within 30 seconds. */
export const defaultTiming: DeliveryTiming = { duplicateGapMs: 5000, lateMs: 60000 };

/** Turns provider events into deliveries; duplicates reuse the same event id on purpose. */
export function scheduleWebhooks(
  events: readonly ProviderEvent[],
  scenario: Scenario,
  timing: DeliveryTiming,
): ScheduledWebhook[] {
  return events.flatMap((event) => {
    if (scenario === "duplicate_webhook") {
      return [
        { event, delayMs: 0 },
        { event, delayMs: timing.duplicateGapMs },
      ];
    }
    return [{ event, delayMs: scenario === "late_webhook" ? timing.lateMs : 0 }];
  });
}
