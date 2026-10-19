import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { postgresBus } from "./bus.js";

class FakeClient extends EventEmitter {
  static all: FakeClient[] = [];
  static failures = 0;
  ended = false;
  queries: string[] = [];
  constructor() {
    super();
    FakeClient.all.push(this);
  }
  connect(): Promise<void> {
    if (FakeClient.failures > 0) {
      FakeClient.failures -= 1;
      return Promise.reject(new Error("refused"));
    }
    return Promise.resolve();
  }
  query(sql: string): Promise<void> {
    this.queries.push(sql);
    return Promise.resolve();
  }
  end(): Promise<void> {
    this.ended = true;
    return Promise.resolve();
  }
}

const log = { error: vi.fn() };
const options = { createClient: () => new FakeClient(), retryMs: 10, maxRetryMs: 40 };

beforeEach(() => {
  vi.useFakeTimers();
  FakeClient.all = [];
  FakeClient.failures = 0;
});
afterEach(() => {
  vi.useRealTimers();
});

describe("postgresBus reconnection", () => {
  it("keeps retrying with a capped backoff until the connection is back", async () => {
    FakeClient.failures = 3;
    postgresBus("postgres://x", log, options);
    await vi.advanceTimersByTimeAsync(1000);
    expect(FakeClient.all.length).toBe(4);
    expect(FakeClient.all[3]?.queries.some((sql) => sql.startsWith("listen"))).toBe(true);
  });

  it("ends the lost client and reconnects when only 'end' fires", async () => {
    const bus = postgresBus("postgres://x", log, options);
    await vi.advanceTimersByTimeAsync(0);
    const first = FakeClient.all[0];
    first?.emit("end");
    await vi.advanceTimersByTimeAsync(100);
    expect(first?.ended).toBe(true);
    expect(FakeClient.all.length).toBe(2);
    await bus.close();
  });

  it("tells subscribers about a reconnection, not about the first connection", async () => {
    const bus = postgresBus("postgres://x", log, options);
    const onReconnect = vi.fn();
    bus.onReconnect(onReconnect);
    await vi.advanceTimersByTimeAsync(0);
    expect(onReconnect).not.toHaveBeenCalled();
    FakeClient.all[0]?.emit("error", new Error("reset"));
    await vi.advanceTimersByTimeAsync(100);
    expect(onReconnect).toHaveBeenCalledTimes(1);
  });

  it("does not connect when the timer fires after close", async () => {
    const bus = postgresBus("postgres://x", log, options);
    await vi.advanceTimersByTimeAsync(0);
    FakeClient.all[0]?.emit("error", new Error("reset"));
    await bus.close();
    await vi.advanceTimersByTimeAsync(1000);
    expect(FakeClient.all.length).toBe(1);
  });
});
