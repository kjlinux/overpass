import type { SandboxDelivery } from "@overpass/shared";
import { describe, expect, it } from "vitest";
import { relayCommand } from "./command";
import { tripOf } from "./trip";

const base: SandboxDelivery = {
  id: "d1",
  eventType: "checkout.session.completed",
  target: "relay",
  status: "scheduled",
  attempts: 0,
  body: "",
  headers: {},
  responseStatus: null,
  durationMs: null,
  dueAt: "2026-10-14T10:00:01Z",
  deliveredAt: null,
};
const time = (iso: string) => iso.slice(11, 19);
const keys = (delivery: Partial<SandboxDelivery>) =>
  tripOf({ ...base, ...delivery }, time).map((stop) => [
    stop.name.key,
    stop.state.key,
    stop.reached,
  ]);

describe("tripOf", () => {
  it("shows a scheduled webhook as leaving later, nothing reached", () => {
    expect(keys({})).toEqual([
      ["overpass", "leaves", false],
      ["relay", "waiting", false],
      ["server", "notYet", false],
    ]);
    expect(tripOf(base, time)[0]?.state.values).toEqual({ time: "10:00:01" });
  });

  it("stops at the relay until the local server answered", () => {
    expect(keys({ status: "sent" })).toEqual([
      ["overpass", "sent", true],
      ["relay", "relayWait", false],
      ["server", "notYet", false],
    ]);
  });

  it("reaches the developer's server with its status and duration", () => {
    const trip = tripOf(
      { ...base, status: "delivered", responseStatus: 204, durationMs: 31 },
      time,
    );
    expect(trip.every((stop) => stop.reached)).toBe(true);
    expect(trip[2]?.state).toEqual({ key: "received", values: { status: "204", duration: "31" } });
  });

  it("names a failed public URL delivery with its status, or no answer", () => {
    const url = { target: "url" as const, status: "failed" as const };
    expect(tripOf({ ...base, ...url, responseStatus: 500 }, time)[2]?.state).toEqual({
      key: "failed",
      values: { reason: "HTTP 500" },
    });
    expect(keys({ ...url })[1]).toEqual(["internet", "passed", true]);
    expect(tripOf({ ...base, ...url }, time)[2]?.state.values?.reason).toBe("noAnswer");
  });

  it("goes straight from Overpass to the built-in receiver", () => {
    expect(
      keys({ target: "inbox", status: "delivered", responseStatus: null, durationMs: 0 }),
    ).toEqual([
      ["overpass", "sent", true],
      ["inbox", "passed", true],
    ]);
  });
});

describe("relayCommand", () => {
  it("prints a copyable command with the key and the API origin", () => {
    expect(relayCommand({ origin: "https://overpass.example", key: "ovp_test_abc" })).toBe(
      [
        "npx overpass-cli listen \\",
        "  --forward-to http://localhost:3000/webhook \\",
        "  --key ovp_test_abc \\",
        "  --api https://overpass.example",
      ].join("\n"),
    );
  });
});
