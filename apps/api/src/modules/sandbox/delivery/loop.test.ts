import { describe, expect, it, vi } from "vitest";
import { createTestDatabase } from "../../../db/testing.js";
import { startWorkerLoop } from "./loop.js";
import { postgresNotifier } from "./notifier.js";

const quietLog = { error: vi.fn() };

function fakeWorker(batches: number[]) {
  const queue = [...batches];
  return {
    runOnce: vi.fn(() => Promise.resolve(queue.shift() ?? 0)),
    purge: vi.fn(() => Promise.resolve({ events: 0, objects: 0 })),
  };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 40));

describe("startWorkerLoop", () => {
  it("drains the queue, then waits for the next poll", async () => {
    const worker = fakeWorker([20, 20, 3]);
    const loop = startWorkerLoop(worker, { pollMs: 1000, purgeMs: 60_000 }, quietLog);
    await settle();
    await loop.stop();
    expect(worker.runOnce).toHaveBeenCalledTimes(4);
    expect(worker.purge).toHaveBeenCalledTimes(1);
  });

  it("keeps running after a failed batch and logs it", async () => {
    const worker = fakeWorker([]);
    worker.runOnce.mockRejectedValueOnce(new Error("database restarting"));
    const loop = startWorkerLoop(worker, { pollMs: 5, purgeMs: 60_000 }, quietLog);
    await settle();
    await loop.stop();
    expect(quietLog.error).toHaveBeenCalled();
    expect(worker.runOnce.mock.calls.length).toBeGreaterThan(1);
  });
});

describe("postgresNotifier", () => {
  it("publishes through pg_notify without failing", async () => {
    const database = await createTestDatabase();
    await expect(
      postgresNotifier(database.db).notify("sandbox_relay", '{"keyId":"k"}'),
    ).resolves.toBeUndefined();
    await database.close();
  });
});
