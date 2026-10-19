import { describe, expect, it } from "vitest";
import { scheduleWebhooks } from "./schedule.js";

const event = { id: "evt_1", type: "payment.paid", payload: {} };
const timing = { duplicateGapMs: 2000, lateMs: 60000 };

describe("scheduleWebhooks", () => {
  it("sends each event once and at once for a plain scenario", () => {
    expect(scheduleWebhooks([event], "success", timing)).toEqual([{ event, delayMs: 0 }]);
  });

  it("sends the same event twice for a duplicate webhook", () => {
    expect(scheduleWebhooks([event], "duplicate_webhook", timing)).toEqual([
      { event, delayMs: 0 },
      { event, delayMs: 2000 },
    ]);
  });

  it("holds the event back for a late webhook", () => {
    expect(scheduleWebhooks([event], "late_webhook", timing)).toEqual([{ event, delayMs: 60000 }]);
  });

  it("schedules nothing when the provider emits no event", () => {
    expect(scheduleWebhooks([], "duplicate_webhook", timing)).toEqual([]);
  });

  it("keeps the order of several events", () => {
    const second = { ...event, id: "evt_2" };
    const plan = scheduleWebhooks([event, second], "insufficient_funds", timing);
    expect(plan.map((entry) => entry.event.id)).toEqual(["evt_1", "evt_2"]);
  });
});
