import { readLocales } from "@overpass/shared";
import type { ProviderAdapter, ProviderCopy } from "@overpass/simulator";
import { paydunyaEndpoints } from "./endpoints.js";
import { paydunyaErrors } from "./errors.js";
import { confirmBody } from "./invoice.js";
import type { InvoiceRecord, PaydunyaOutcome } from "./invoice.js";
import protocol from "./protocol.json" with { type: "json" };
import { ipnEvents } from "./schemas.js";
import { ipnForm, masterKeyHash } from "./wire.js";

const merchantHeaders = {
  "content-type": "application/json",
  "paydunya-master-key": protocol.stepMasterKey,
  "paydunya-token": protocol.stepToken,
};

/** Unofficial PayDunya checkout invoice simulator, built from the public HTTP/JSON page only. */
export const paydunya: ProviderAdapter<PaydunyaOutcome> = {
  rank: 3,
  identity: {
    id: "paydunya",
    name: "PayDunya",
    countries: ["SN", "BJ", "CI", "TG", "ML", "BF", "CM"],
    docsUrl: "https://developers.paydunya.com/doc/FR/http_json",
    docsVersion: "2026-10-15",
    consultedAt: "2026-10-15",
    unofficial: true,
    copy: readLocales<ProviderCopy>(new URL("./locales/", import.meta.url)),
  },
  scenarios: {
    success: { status: "completed" },
    insufficient_funds: { status: "failed" },
    timeout: { status: "pending" },
    duplicate_webhook: { status: "completed" },
    late_webhook: { status: "completed" },
  },
  auth: { type: "header", name: "PAYDUNYA-PRIVATE-KEY" },
  secretHeaders: ["paydunya-master-key", "paydunya-private-key", "paydunya-token"],
  steps: [
    {
      id: "invoice",
      launch: true,
      method: "POST",
      path: "/sandbox-api/v1/checkout-invoice/create",
      headers: merchantHeaders,
      capture: { token: "token" },
      body: {
        invoice: { total_amount: 5000, description: protocol.stepDescription },
        store: { name: protocol.stepStore },
      },
    },
    {
      id: "confirm",
      method: "GET",
      path: "/sandbox-api/v1/checkout-invoice/confirm/{{token}}",
      headers: merchantHeaders,
    },
  ],
  credential: (request) => request.headers["paydunya-private-key"],
  errors: {
    notFound: paydunyaErrors.notFound,
    unauthorized: paydunyaErrors.unauthorized,
    tooManyRequests: paydunyaErrors.tooManyRequests,
  },
  endpoints: paydunyaEndpoints,
  webhooks: {
    events: ipnEvents,
    render(event, { secret }) {
      const data = confirmBody(event.payload as InvoiceRecord, masterKeyHash(secret));
      return {
        body: ipnForm(data),
        headers: { "content-type": "application/x-www-form-urlencoded" },
      };
    },
  },
};
