import type { Scenario } from "@overpass/simulator";
import { describe, expect, it } from "vitest";
import { harness } from "../testing.js";
import { pispi } from "./index.js";

const payer = "8b1b2499-3e50-435b-b757-ac7a83d8aa7f";
const payee = "8b1b2499-3e50-435b-b757-ac7a83d8aa8c";
const form = { "content-type": "application/x-www-form-urlencoded" };

async function signedIn() {
  const sim = harness(pispi);
  const rawBody = "grant_type=client_credentials&client_id=overpass&client_secret=test";
  const token = await sim.call("success", {
    method: "POST",
    path: "/oauth/token",
    headers: form,
    rawBody,
    body: Object.fromEntries(new URLSearchParams(rawBody)),
  });
  const bearer = (token.response.body as { access_token: string }).access_token;
  const as = (scenario: Scenario, method: "GET" | "POST" | "PUT", path: string, body?: unknown) =>
    sim.call(scenario, {
      method,
      path,
      headers: { authorization: `Bearer ${bearer}` },
      ...(body === undefined ? {} : { body }),
    });
  return { sim, token, as };
}

const request = (txId: string, confirmation = false) => ({
  txId,
  confirmation,
  payeurAlias: payer,
  payeAlias: payee,
  montant: 150000,
  categorie: "500",
});

describe("OAuth2 token", () => {
  it("issues a bearer token for client_credentials, valid one hour", async () => {
    const { token } = await signedIn();
    expect(token.response.status).toBe(200);
    expect(token.response.body).toMatchObject({ token_type: "Bearer", expires_in: 3600 });
  });

  it("refuses another grant type with a problem document", async () => {
    const result = await harness(pispi).call("success", {
      method: "POST",
      path: "/oauth/token",
      headers: form,
      body: { grant_type: "password" },
    });
    expect(result.response.status).toBe(400);
    expect(result.response.headers).toMatchObject({ "content-type": "application/problem+json" });
    expect(result.response.body).toMatchObject({
      type: "about:blank",
      status: 400,
      "invalid-params": [{ name: "grant_type" }],
    });
  });

  it("answers 401 with a problem document when the bearer token is missing", async () => {
    const result = await harness(pispi).call("success", {
      method: "GET",
      path: "/piz/v1/demandes-paiements",
    });
    expect(result.response).toMatchObject({
      status: 401,
      body: { title: "Unauthorized", status: 401 },
    });
  });
});

describe("payment requests", () => {
  it("sends the request, then the payer accepts it and PAIEMENT_RECU follows", async () => {
    const { as } = await signedIn();
    const created = await as("success", "POST", "/piz/v1/demandes-paiements", request("tx-1"));
    expect(created.response.body).toMatchObject({
      txId: "tx-1",
      statut: "ENVOYE",
      montant: 150000,
    });
    expect((created.response.body as { end2endId: string }).end2endId).toMatch(
      /^E[A-Z]{2}[BCDEF]\d{3}\d{14}[A-Za-z0-9]{14}$/,
    );
    expect(created.webhooks[0]?.event).toMatchObject({
      type: "PAIEMENT_RECU",
      payload: { evCode: "PAIEMENT_RECU", txId: "tx-1", montant: 150000 },
    });
    const read = await as("success", "GET", "/piz/v1/demandes-paiements/tx-1");
    expect(read.response.body).toMatchObject({ statut: "IRREVOCABLE" });
  });

  it.each([
    ["insufficient_funds", "AM04"],
    ["timeout", "AB03"],
  ] as const)("rejects the payment for %s with reason %s", async (scenario, reason) => {
    const { as } = await signedIn();
    const created = await as(scenario, "POST", "/piz/v1/demandes-paiements", request("tx-2"));
    expect(created.webhooks[0]?.event.payload).toMatchObject({
      evCode: "PAIEMENT_REJETE",
      motif: reason,
    });
    const read = await as("success", "GET", "/piz/v1/demandes-paiements/tx-2");
    expect(read.response.body).toMatchObject({ statut: "REJETE", statutRaison: reason });
  });

  it("answers a duplicate txId with HTTP 200 and REJETE DU03", async () => {
    const { as } = await signedIn();
    await as("success", "POST", "/piz/v1/demandes-paiements", request("tx-3"));
    const again = await as("success", "POST", "/piz/v1/demandes-paiements", request("tx-3"));
    expect(again.response).toMatchObject({
      status: 200,
      body: { statut: "REJETE", statutRaison: "DU03" },
    });
    expect(again.webhooks).toEqual([]);
  });

  it("waits for confirmation, then sends on decision true and refuses a second decision", async () => {
    const { as } = await signedIn();
    const created = await as(
      "success",
      "POST",
      "/piz/v1/demandes-paiements",
      request("tx-4", true),
    );
    expect(created.response.body).toMatchObject({ statut: "INITIE" });
    expect(created.webhooks).toEqual([]);
    const confirmed = await as("success", "PUT", "/piz/v1/demandes-paiements/tx-4/confirmations", {
      decision: true,
    });
    expect(confirmed.response.body).toMatchObject({ statut: "ENVOYE" });
    expect(confirmed.webhooks).toHaveLength(1);
    const late = await as("success", "PUT", "/piz/v1/demandes-paiements/tx-4/confirmations", {
      decision: false,
    });
    expect(late.response).toMatchObject({ status: 403 });
  });

  it("cancels on decision false", async () => {
    const { as } = await signedIn();
    await as("success", "POST", "/piz/v1/demandes-paiements", request("tx-5", true));
    const cancelled = await as("success", "PUT", "/piz/v1/demandes-paiements/tx-5/confirmations", {
      decision: false,
    });
    expect(cancelled.response.body).toMatchObject({ statut: "ANNULE" });
  });

  it("validates the request against the documented schema", async () => {
    const { as } = await signedIn();
    const result = await as("success", "POST", "/piz/v1/demandes-paiements", {
      ...request("tx-6"),
      montant: 0,
      categorie: "999",
    });
    expect(result.response.status).toBe(400);
    const names = (result.response.body as { "invalid-params": { name: string }[] })[
      "invalid-params"
    ].map((param) => param.name);
    expect(names).toEqual(expect.arrayContaining(["montant", "categorie"]));
  });

  it("lists the requests with a meta block", async () => {
    const { as } = await signedIn();
    await as("success", "POST", "/piz/v1/demandes-paiements", request("tx-7"));
    const list = await as("success", "GET", "/piz/v1/demandes-paiements");
    expect(list.response.body).toMatchObject({ data: [{ txId: "tx-7" }], meta: { total: 1 } });
  });
});
