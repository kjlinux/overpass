import { readLocales } from "@overpass/shared";
import type { ProviderAdapter, ProviderCopy } from "@overpass/simulator";
import { credentialOf } from "./auth.js";
import { cinetpayEndpoints } from "./endpoints.js";
import { cinetpayErrors } from "./errors.js";
import type { CinetpayOutcome } from "./payment.js";
import protocol from "./protocol.json" with { type: "json" };
import { notification } from "./schemas.js";

const bearer = { authorization: "Bearer {{token}}" };

/** Unofficial CinetPay REST API simulator, built from the official SDK README only. */
export const cinetpay: ProviderAdapter<CinetpayOutcome> = {
  rank: 4,
  identity: {
    id: "cinetpay",
    name: "CinetPay",
    countries: ["CI", "SN", "CM", "ML", "BF", "TG", "BJ", "GN", "CD"],
    docsUrl: "https://github.com/cinetpay/cinetpay-php-sdk",
    docsVersion: "3.0.1",
    consultedAt: "2026-10-20",
    unofficial: true,
    copy: readLocales<ProviderCopy>(new URL("./locales/", import.meta.url)),
  },
  scenarios: {
    success: { status: "SUCCESS" },
    insufficient_funds: { status: "INSUFFICIENT_BALANCE" },
    timeout: { status: "PENDING" },
    duplicate_webhook: { status: "SUCCESS" },
    late_webhook: { status: "SUCCESS" },
  },
  auth: { type: "bearer" },
  steps: [
    {
      id: "login",
      launch: true,
      method: "POST",
      path: "/v1/oauth/login",
      body: { api_key: protocol.stepApiKey, api_password: protocol.stepApiPassword },
      capture: { token: "access_token" },
    },
    {
      id: "payment",
      launch: true,
      method: "POST",
      path: "/v1/payment",
      headers: bearer,
      capture: { merchantId: "merchant_transaction_id" },
      body: {
        currency: "XOF",
        merchant_transaction_id: "ORDER-{{fresh}}",
        amount: 5000,
        success_url: "https://shop.example/payment/success",
        failed_url: "https://shop.example/payment/failed",
        notify_url: "https://shop.example/webhooks/cinetpay",
        lang: "fr",
        designation: protocol.stepDesignation,
      },
    },
    { id: "check", method: "GET", path: "/v1/payment/{{merchantId}}", headers: bearer },
  ],
  credential: credentialOf,
  errors: {
    notFound: cinetpayErrors.notFound,
    unauthorized: cinetpayErrors.invalidToken,
    tooManyRequests: cinetpayErrors.tooManyRequests,
  },
  endpoints: cinetpayEndpoints,
  webhooks: {
    events: { SUCCESS: notification, INSUFFICIENT_BALANCE: notification },
    render: (event) => ({
      body: JSON.stringify(event.payload),
      headers: { "content-type": "application/json" },
    }),
  },
};
