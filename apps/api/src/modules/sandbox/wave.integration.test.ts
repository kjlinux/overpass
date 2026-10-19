import { createHmac } from "node:crypto";
import { providers } from "@overpass/providers";
import { createSimulator } from "@overpass/simulator";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "../../db/client.js";
import { call } from "../../testing-routes.js";
import { createTestApp, registerAccount } from "../../testing.js";
import { createDeliveryWorker } from "./delivery/worker.js";

let app: FastifyInstance;
let db: Database;
let close: () => Promise<void>;
let awa: string;
const secret = "test-secret-with-at-least-32-characters!";

beforeEach(async () => {
  ({ app, db, close } = await createTestApp());
  awa = await registerAccount(app, "awa@example.com");
});
afterEach(() => close());

const order = {
  amount: "2500",
  currency: "XOF",
  error_url: "https://shop.example/error",
  success_url: "https://shop.example/success",
};

describe("Wave through the sandbox", () => {
  it("signs the webhook with the secret shown for the key", async () => {
    const key = (
      await call(app, "POST", "/v1/sandbox/keys", { cookie: awa, payload: { provider: "wave" } })
    ).body.data as { id: string; key: string; webhookSecret: string };
    const created = await app.inject({
      method: "POST",
      url: "/v1/sandbox/wave/v1/checkout/sessions",
      headers: { authorization: `Bearer ${key.key}`, "content-type": "application/json" },
      payload: JSON.stringify(order),
    });
    expect(created.statusCode).toBe(200);
    expect(created.json()).toMatchObject({
      checkout_status: "open",
      wave_launch_url: expect.stringContaining(
        "http://web.test/sandbox/launch/wave/cos-",
      ) as string,
    });
    const worker = createDeliveryWorker({
      db,
      simulator: createSimulator(providers),
      serverSecret: secret,
      resolveHost: () => Promise.resolve([]),
      notifier: { notify: () => Promise.resolve() },
      now: () => new Date(),
    });
    expect(await worker.runOnce()).toBe(1);
    const events = (await call(app, "GET", `/v1/sandbox/events?keyId=${key.id}`, { cookie: awa }))
      .body.data as unknown as {
      deliveries: { body: string; headers: Record<string, string> }[];
    }[];
    const delivery = events[0]?.deliveries[0];
    const [, stamp, v1] =
      /^t=(\d+),v1=([0-9a-f]{64})$/.exec(delivery?.headers["wave-signature"] ?? "") ?? [];
    const expected = createHmac("sha256", key.webhookSecret)
      .update(`${stamp ?? ""}${delivery?.body ?? ""}`)
      .digest("hex");
    expect(key.webhookSecret).toMatch(/^wave_sn_WHS_/);
    expect(v1).toBe(expected);
    expect(JSON.parse(delivery?.body ?? "{}")).toMatchObject({
      type: "checkout.session.completed",
      data: { amount: "2500", payment_status: "succeeded" },
    });
  });

  it("answers a missing key the way Wave documents it", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/v1/sandbox/wave/v1/checkout/sessions/cos-x",
    });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ code: "missing-auth-header" });
  });
});
