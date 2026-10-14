import { createHmac } from "node:crypto";
import type { ProviderAdapter, SimRequest } from "./contract.js";

type FakeOutcome = { status: "paid" | "failed" | "expired"; reason?: string };

type FakePayment = { id: string; amount: number; status: string; reason?: string };

/** A provider that exists only in tests, to prove the engine needs no change to load one. */
export const fakeProvider: ProviderAdapter<FakeOutcome> = {
  identity: {
    id: "fake",
    name: "Fake Pay",
    countries: ["CI"],
    docsUrl: "https://example.com/docs",
    docsVersion: "1.0",
    consultedAt: "2026-10-14",
    unofficial: true,
    copy: {
      fr: { summary: "Opérateur de test", notes: [] },
      en: { summary: "Test provider", notes: [] },
    },
  },
  scenarios: {
    success: { status: "paid" },
    insufficient_funds: { status: "failed", reason: "no-money" },
    timeout: { status: "expired" },
    duplicate_webhook: { status: "paid" },
    late_webhook: { status: "paid" },
  },
  credential: (request) => request.headers["x-fake-key"],
  errors: {
    notFound: () => ({ status: 404, body: { error: "not_found" } }),
    unauthorized: () => ({ status: 401, body: { error: "unauthorized" } }),
    tooManyRequests: () => ({ status: 429, body: { error: "slow_down" } }),
  },
  endpoints: [
    {
      method: "POST",
      path: "/payments",
      async handle({ request, outcome, store, newId }) {
        const amount = Number((request.body as { amount?: unknown }).amount);
        const payment: FakePayment = { id: newId(), amount, ...outcome };
        await store.put("payment", payment.id, payment);
        const events =
          outcome.status === "expired"
            ? []
            : [{ id: newId(), type: `payment.${outcome.status}`, payload: payment }];
        return { response: { status: 201, body: payment }, events };
      },
    },
    {
      method: "GET",
      path: "/payments/:id",
      async handle({ params, store }) {
        const payment = await store.get("payment", params.id ?? "");
        if (payment === undefined) return { response: { status: 404, body: {} } };
        return { response: { status: 200, body: payment } };
      },
    },
  ],
  webhooks: {
    render(event, { secret, now }) {
      const body = JSON.stringify({ id: event.id, type: event.type, data: event.payload });
      const stamp = Math.floor(now.getTime() / 1000).toString();
      const signature = createHmac("sha256", secret).update(stamp + body).digest("hex");
      return { body, headers: { "content-type": "application/json", "x-fake-signature": signature } };
    },
  },
};

/** An in-memory object store, the shape the sandbox module backs with PostgreSQL. */
export function memoryStore() {
  const objects = new Map<string, unknown>();
  return {
    get: (kind: string, id: string) => Promise.resolve(objects.get(`${kind}:${id}`)),
    put: (kind: string, id: string, value: unknown) => {
      objects.set(`${kind}:${id}`, value);
      return Promise.resolve();
    },
    list: (kind: string) =>
      Promise.resolve([...objects].filter(([k]) => k.startsWith(`${kind}:`)).map(([, v]) => v)),
  };
}

export function request(partial: Partial<SimRequest> & Pick<SimRequest, "method" | "path">) {
  const body = partial.body ?? {};
  return { query: {}, headers: {}, rawBody: JSON.stringify(body), ...partial, body };
}

export function sequentialIds() {
  let next = 0;
  return () => `id_${(++next).toString()}`;
}
