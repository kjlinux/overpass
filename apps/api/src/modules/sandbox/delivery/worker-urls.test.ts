import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { workerHarness } from "./testing-worker.js";

const w = workerHarness();
beforeEach(w.setup);
afterEach(w.teardown);
const { worker, pay, deliveries } = w;

describe("delivery worker and webhook URLs", () => {
  it("names the https rule when a queued delivery still holds a plain http URL", async () => {
    const keyId = await pay({ target: "url", webhookUrl: "https://hooks.example.com/in" });
    // A delivery copies the URL when it is scheduled, so one queued before migration 0019 keeps http.
    await w.db.execute(
      sql`update sandbox_deliveries set webhook_url = 'http://hooks.example.com/in' where key_id = ${keyId}`,
    );
    const send = vi.fn(() => Promise.resolve({ status: 200, durationMs: 1 }));
    await worker(send).runOnce();
    expect(send).not.toHaveBeenCalled();
    const rows: unknown = await w.db.execute(
      sql`select status, last_error from sandbox_deliveries where key_id = ${keyId}`,
    );
    expect((rows as { rows: unknown[] }).rows[0]).toMatchObject({
      status: "failed",
      last_error: "https_required",
    });
  });

  it("refuses a URL whose name w.now resolves to a private address", async () => {
    const keyId = await pay({ target: "url", webhookUrl: "https://hooks.example.com/in" });
    w.dns["hooks.example.com"] = ["169.254.169.254"];
    const send = vi.fn(() => Promise.resolve({ status: 200, durationMs: 1 }));
    await worker(send).runOnce();
    expect(send).not.toHaveBeenCalled();
    expect((await deliveries(keyId))[0]).toMatchObject({ status: "failed" });
  });
});
