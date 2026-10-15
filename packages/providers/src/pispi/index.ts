import { createHmac } from "node:crypto";
import type { ProviderAdapter } from "@overpass/simulator";
import { pispiEndpoints } from "./endpoints.js";
import en from "./locales/en.json" with { type: "json" };
import fr from "./locales/fr.json" with { type: "json" };
import { problems } from "./problem.js";
import { webhookEvents } from "./schemas.js";
import type { PispiOutcome } from "./settle.js";

const form = { "content-type": "application/x-www-form-urlencoded" };
const bearer = { authorization: "Bearer {{token}}" };
const payee = "9b1b2499-3e50-435b-b757-ac7a83d8aa8c";
const payer = "8b1b2499-3e50-435b-b757-ac7a83d8aa7f";

/** Unofficial PI-SPI API Business simulator, built from the BCEAO specification 1.5.0 only. */
export const pispi: ProviderAdapter<PispiOutcome> = {
  identity: {
    id: "pi-spi",
    name: "PI-SPI",
    countries: ["BJ", "BF", "CI", "GW", "ML", "NE", "SN", "TG"],
    docsUrl: "https://developer.pispi.bceao.int/api-business",
    docsVersion: "1.5.0",
    consultedAt: "2026-10-14",
    officialSandboxUrl: "https://developer.pispi.bceao.int/dashboard",
    unofficial: true,
    copy: { fr, en },
  },
  scenarios: {
    success: { accept: true },
    insufficient_funds: { accept: false, reason: "AM04" },
    timeout: { accept: false, reason: "AB03" },
    duplicate_webhook: { accept: true },
    late_webhook: { accept: true },
  },
  auth: { type: "header", name: "x-api-key" },
  credential: (request) => request.headers["x-api-key"],
  errors: {
    notFound: () => problems.notFound(),
    unauthorized: () => problems.unauthorized(),
    tooManyRequests: () => problems.tooManyRequests(),
  },
  endpoints: pispiEndpoints,
  steps: [
    {
      id: "token",
      launch: true,
      method: "POST",
      path: "/oauth/token",
      headers: form,
      body: "grant_type=client_credentials&client_id=overpass&client_secret=overpass&scope=demande_paiement.write",
      capture: { token: "access_token" },
    },
    {
      id: "request",
      launch: true,
      method: "POST",
      path: "/piz/v1/demandes-paiements",
      headers: bearer,
      body: {
        txId: "ovp-{{fresh}}",
        confirmation: false,
        payeurAlias: payer,
        payeAlias: payee,
        montant: 15000,
        categorie: "500",
        motif: "Commande 1042",
      },
      capture: { txId: "txId" },
    },
    { id: "read", method: "GET", path: "/piz/v1/demandes-paiements/{{txId}}", headers: bearer },
  ],
  webhooks: {
    secretPrefix: "xsk_",
    events: {
      PAIEMENT_RECU: webhookEvents,
      PAIEMENT_REJETE: webhookEvents,
      RETOUR_ENVOYE: webhookEvents,
    },
    signatureHeader: "x-signature",
    render(event, { secret }) {
      const body = JSON.stringify({ data: [event.payload], meta: { total: 1 } });
      const signature = createHmac("sha256", secret).update(body).digest("hex");
      return { body, headers: { "content-type": "application/json", "x-signature": signature } };
    },
  },
};
