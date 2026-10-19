import type { SandboxEvent } from "@overpass/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pollEvent } from "./poll";

const eventOf = (id: string, status: string) =>
  ({ id, deliveries: [{ status }] }) as unknown as SandboxEvent;

function deferred() {
  let resolve: (event: SandboxEvent | null) => void = () => undefined;
  const promise = new Promise<SandboxEvent | null>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("pollEvent", () => {
  it("ignores an answer that arrives after the poll was stopped", async () => {
    const pending = deferred();
    const onEvent = vi.fn();
    const stop = pollEvent({
      id: "a",
      fetchEvent: () => pending.promise,
      onEvent,
      intervalMs: 1000,
      limit: 5,
    });
    await vi.advanceTimersByTimeAsync(1000);
    stop();
    pending.resolve(eventOf("a", "delivered"));
    await vi.runAllTimersAsync();
    expect(onEvent).not.toHaveBeenCalled();
  });

  it("ignores an event that belongs to another run", async () => {
    const onEvent = vi.fn();
    pollEvent({
      id: "b",
      fetchEvent: () => Promise.resolve(eventOf("a", "scheduled")),
      onEvent,
      intervalMs: 1000,
      limit: 2,
    });
    await vi.advanceTimersByTimeAsync(2000);
    expect(onEvent).not.toHaveBeenCalled();
  });

  it("stops once the webhook has settled", async () => {
    const fetchEvent = vi.fn(() => Promise.resolve(eventOf("a", "delivered")));
    const onEvent = vi.fn();
    pollEvent({ id: "a", fetchEvent, onEvent, intervalMs: 1000, limit: 90 });
    await vi.advanceTimersByTimeAsync(5000);
    expect(onEvent).toHaveBeenCalledTimes(1);
    expect(fetchEvent).toHaveBeenCalledTimes(1);
  });
});
