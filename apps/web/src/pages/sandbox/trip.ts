import type { SandboxDelivery } from "@overpass/shared";

export type Label = { key: string; values?: Record<string, string> };
export type TripStop = { name: Label; state: Label; reached: boolean };

type Delivery = Pick<
  SandboxDelivery,
  "target" | "status" | "dueAt" | "responseStatus" | "durationMs"
>;

const middle = { relay: "relay", url: "internet" } as const;
const end = { relay: "server", url: "url" } as const;

function arrival(delivery: Delivery): TripStop["state"] {
  if (delivery.status === "delivered") {
    const values = {
      status: String(delivery.responseStatus ?? ""),
      duration: String(delivery.durationMs ?? 0),
    };
    return { key: "received", values };
  }
  if (delivery.status === "failed") {
    const reason =
      delivery.responseStatus === null ? "noAnswer" : `HTTP ${String(delivery.responseStatus)}`;
    return { key: "failed", values: { reason } };
  }
  return { key: "notYet" };
}

/** The road a webhook travels, stop by stop, as labels the page translates. */
export function tripOf(delivery: Delivery, time: (iso: string) => string): TripStop[] {
  const left = delivery.status !== "scheduled";
  const departure: TripStop = {
    name: { key: "overpass" },
    state: { key: left ? "sent" : "leaves", values: { time: time(delivery.dueAt) } },
    reached: left,
  };
  const done = delivery.status === "delivered" || delivery.status === "failed";
  if (delivery.target === "inbox") {
    return [
      departure,
      { name: { key: "inbox" }, state: { key: done ? "passed" : "waiting" }, reached: done },
    ];
  }
  const waiting = delivery.status === "sent" ? "relayWait" : "waiting";
  return [
    departure,
    {
      name: { key: middle[delivery.target] },
      state: { key: done ? "passed" : waiting },
      reached: done,
    },
    {
      name: { key: end[delivery.target] },
      state: arrival(delivery),
      reached: delivery.status === "delivered",
    },
  ];
}

function identityOf(body: string): string {
  try {
    const parsed = JSON.parse(body) as { id?: unknown };
    return typeof parsed.id === "string" ? parsed.id : body;
  } catch {
    return body;
  }
}

/** Whether a delivery repeats the previous one: same event id, or the same body when there is none. */
export function repeatsPrevious(bodies: readonly string[], index: number): boolean {
  const current = bodies[index];
  const previous = bodies[index - 1];
  if (index === 0 || current === undefined || previous === undefined) return false;
  return identityOf(current) === identityOf(previous);
}
