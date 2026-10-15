import type { ProviderAdapter } from "@overpass/simulator";

type Outcome = { status: string };

/** A provider known only to the API tests: loading it needs no change in the module. */
export const testProvider: ProviderAdapter<Outcome> = {
  identity: {
    id: "fake",
    name: "Fake Pay",
    countries: ["CI"],
    docsUrl: "https://example.com/docs",
    docsVersion: "1.0",
    consultedAt: "2026-10-14",
    unofficial: true,
    copy: {
      fr: { summary: "Opérateur de test", notes: ["Note fr"] },
      en: { summary: "Test provider", notes: ["Note en"] },
    },
  },
  scenarios: {
    success: { status: "paid" },
    insufficient_funds: { status: "failed" },
    timeout: { status: "expired" },
    duplicate_webhook: { status: "paid" },
    late_webhook: { status: "paid" },
  },
  credential: (request) => request.headers["authorization"]?.replace(/^Bearer /, ""),
  errors: {
    notFound: () => ({ status: 404, body: { code: "not-found" } }),
    unauthorized: () => ({ status: 401, body: { code: "invalid-auth" } }),
    tooManyRequests: () => ({ status: 429, body: { code: "rate-limited" } }),
  },
  steps: [
    {
      id: "pay",
      method: "POST",
      path: "/payments",
      body: { amount: 2500 },
      launch: true,
      capture: { paymentId: "id" },
    },
    { id: "read", method: "GET", path: "/payments/{{paymentId}}" },
  ],
  endpoints: [
    {
      method: "POST",
      path: "/payments",
      async handle({ request, outcome, store, newId }) {
        const payment = { status: outcome.status, id: `pay_${newId()}`, body: request.body };
        await store.put("payment", payment.id, payment);
        const events =
          outcome.status === "expired"
            ? []
            : [{ id: `evt_${newId()}`, type: `payment.${outcome.status}`, payload: payment }];
        return { response: { status: 201, headers: { "x-fake": "1" }, body: payment }, events };
      },
    },
    {
      method: "GET",
      path: "/payments/:id",
      async handle({ params, store }) {
        const payment = await store.get("payment", params.id ?? "");
        return {
          response:
            payment === undefined ? { status: 404, body: {} } : { status: 200, body: payment },
        };
      },
    },
  ],
  webhooks: {
    secretPrefix: "fake_whs_",
    render: (event) => ({
      body: JSON.stringify(event),
      headers: { "content-type": "application/json" },
    }),
  },
};
