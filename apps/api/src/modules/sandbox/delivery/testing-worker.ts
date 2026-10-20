import { createSimulator } from "@overpass/simulator";
import type { FastifyInstance } from "fastify";
import type { Database } from "../../../db/client.js";
import { call } from "../../../testing-routes.js";
import { createTestApp, registerAccount } from "../../../testing.js";
import { testProvider } from "../fixtures.js";
import type { SendResult, WebhookRequest } from "./http-client.js";
import { createDeliveryWorker } from "./worker.js";
import type { WorkerDeps } from "./worker.js";

type Delivered = {
  status: string;
  attempts: number;
  body: string;
  headers: Record<string, string>;
  responseStatus: number | null;
  dueAt: string;
};

/** Mutable on purpose: each test moves the clock and rewires the fake DNS. */
export type WorkerWorld = {
  app: FastifyInstance;
  db: Database;
  close: () => Promise<void>;
  awa: string;
  time: number;
  dns: Record<string, string[]>;
  notified: { channel: string; payload: string }[];
  now: () => Date;
};

async function setup(w: WorkerWorld): Promise<void> {
  w.time = Date.parse("2026-10-14T10:00:00Z");
  w.dns = { "hooks.example.com": ["93.184.216.34"] };
  w.notified.length = 0;
  const resolveHost = (host: string) => Promise.resolve(w.dns[host] ?? []);
  const sandbox = { providers: [testProvider], resolveHost };
  ({ app: w.app, db: w.db, close: w.close } = await createTestApp({ now: w.now, sandbox }));
  w.awa = await registerAccount(w.app, "awa@example.com");
}

function workerOf(w: WorkerWorld) {
  return (
    send: (request: WebhookRequest) => Promise<SendResult> = () =>
      Promise.resolve({ status: 200, durationMs: 12 }),
    extra: Partial<WorkerDeps> = {},
  ) =>
    createDeliveryWorker({
      db: w.db,
      simulator: createSimulator([testProvider]),
      serverSecret: "s".repeat(40),
      resolveHost: (host: string) => Promise.resolve(w.dns[host] ?? []),
      send,
      notifier: {
        notify: (channel: string, payload: string) =>
          Promise.resolve(void w.notified.push({ channel, payload })),
      },
      now: w.now,
      ...extra,
    });
}

/** Creates a test key with the given webhook settings and makes one payment with it. */
async function pay(w: WorkerWorld, payload: object): Promise<string> {
  const created = await call(w.app, "POST", "/v1/sandbox/keys", {
    cookie: w.awa,
    payload: { provider: "fake", ...payload },
  });
  const key = created.body.data as { id: string; key: string };
  await w.app.inject({
    method: "POST",
    url: "/v1/sandbox/fake/payments",
    headers: { authorization: `Bearer ${key.key}` },
    payload: {},
  });
  return key.id;
}

async function deliveries(w: WorkerWorld, keyId: string): Promise<Delivered[]> {
  const url = `/v1/sandbox/events?keyId=${keyId}`;
  const events = (await call(w.app, "GET", url, { cookie: w.awa })).body.data as unknown as {
    deliveries: Delivered[];
  }[];
  return events.flatMap((event) => event.deliveries);
}

/** One API with a fake provider, a fixed clock and a fake DNS, shared by the worker tests. */
export function workerHarness() {
  const w = { notified: [], time: 0, dns: {}, awa: "" } as unknown as WorkerWorld;
  w.now = () => new Date(w.time);
  return Object.assign(w, {
    setup: () => setup(w),
    teardown: () => w.close(),
    worker: workerOf(w),
    pay: (payload: object) => pay(w, payload),
    deliveries: (keyId: string) => deliveries(w, keyId),
  });
}
