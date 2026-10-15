import type { ProviderEvent, RenderedWebhook, Simulator } from "@overpass/simulator";
import type { Database } from "../../../db/client.js";
import { webhookSecret } from "../keys.js";
import { publicAddresses } from "../network/resolve.js";
import type { HostResolver } from "../network/resolve.js";
import { sendWebhook } from "./http-client.js";
import type { SendResult, WebhookRequest } from "./http-client.js";
import { deliveryQueue } from "./queue.js";
import type { DeliveryQueue, DeliveryUpdate, QueuedDelivery } from "./queue.js";

export type Notifier = { notify(channel: string, payload: string): Promise<void> };

export type WorkerDeps = {
  db: Database;
  simulator: Simulator;
  serverSecret: string;
  resolveHost: HostResolver;
  notifier: Notifier;
  now: () => Date;
  log?: { error(details: unknown, message?: string): void };
  send?: (request: WebhookRequest) => Promise<SendResult>;
};

export const relayChannel = "sandbox_relay";
const batchSize = 20;
const leaseMs = 60_000;
const timeoutMs = 5_000;
const maxAttempts = 5;
/** Waits after attempts 1 to 4; the documented providers only ask for retries, not a schedule. */
const backoffMs = [10_000, 60_000, 300_000, 1_800_000];

function isSuccess(status: number | null): boolean {
  return status !== null && status >= 200 && status < 300;
}

function afterHttp(row: QueuedDelivery, result: SendResult, now: Date): DeliveryUpdate {
  const common = { responseStatus: result.status, durationMs: result.durationMs, sentAt: now };
  if (isSuccess(result.status))
    return { ...common, status: "delivered", deliveredAt: now, lastError: null };
  const lastError = result.error ?? `http_${String(result.status)}`;
  if (row.attempts >= maxAttempts) return { ...common, status: "failed", lastError };
  const wait = backoffMs[row.attempts - 1] ?? backoffMs[backoffMs.length - 1] ?? 0;
  return { ...common, status: "scheduled", lastError, dueAt: new Date(now.getTime() + wait) };
}

type Delivery = { deps: WorkerDeps; queue: DeliveryQueue; send: Sender };
type Sender = (request: WebhookRequest) => Promise<SendResult>;

function render(deps: WorkerDeps, row: QueuedDelivery, now: Date): RenderedWebhook {
  const prefix = deps.simulator.secretPrefix(row.provider);
  const secret = webhookSecret(deps.serverSecret, row.keyId, prefix);
  return deps.simulator.renderWebhook(row.provider, row.event as ProviderEvent, { secret, now });
}

async function toUrl(
  { deps, send }: Delivery,
  row: QueuedDelivery,
  wire: RenderedWebhook,
  now: Date,
): Promise<DeliveryUpdate> {
  const url = row.webhookUrl ?? "";
  const addresses = await publicAddresses(url, deps.resolveHost);
  if (addresses === undefined) return { status: "failed", lastError: "private_address" };
  return afterHttp(row, await send({ url, addresses, ...wire, timeoutMs }), now);
}

async function deliver(delivery: Delivery, row: QueuedDelivery): Promise<void> {
  const { deps, queue } = delivery;
  const now = deps.now();
  let wire: RenderedWebhook;
  try {
    wire = render(deps, row, now);
  } catch {
    return queue.finish(row.id, { status: "failed", lastError: "unknown_provider" });
  }
  const rendered = { body: wire.body, headers: wire.headers, sentAt: now };
  if (row.target === "inbox") {
    return queue.finish(row.id, {
      ...rendered,
      status: "delivered",
      deliveredAt: now,
      durationMs: 0,
    });
  }
  if (row.target === "relay") {
    await queue.finish(row.id, { ...rendered, status: "sent" });
    const payload = JSON.stringify({ keyId: row.keyId, deliveryId: row.id });
    return deps.notifier.notify(relayChannel, payload);
  }
  return queue.finish(row.id, { ...rendered, ...(await toUrl(delivery, row, wire, now)) });
}

/** A row past its last attempt was reclaimed after crashing; stop it rather than loop. */
async function settle(delivery: Delivery, row: QueuedDelivery): Promise<void> {
  try {
    if (row.attempts > maxAttempts) {
      await delivery.queue.finish(row.id, { status: "failed", lastError: "delivery_crashed" });
      return;
    }
    await deliver(delivery, row);
  } catch (error) {
    delivery.deps.log?.error({ err: error, deliveryId: row.id }, "sandbox delivery failed");
  }
}

/** Takes due deliveries from PostgreSQL and sends them where each key asked. */
export function createDeliveryWorker(deps: WorkerDeps) {
  const delivery: Delivery = {
    deps,
    queue: deliveryQueue(deps.db),
    send: deps.send ?? sendWebhook,
  };
  return {
    async runOnce(): Promise<number> {
      const claimed = await delivery.queue.claim(deps.now(), batchSize, leaseMs);
      await Promise.all(claimed.map((row) => settle(delivery, row)));
      return claimed.length;
    },
    purge: () => delivery.queue.purge(deps.now()),
  };
}

export type DeliveryWorker = ReturnType<typeof createDeliveryWorker>;
