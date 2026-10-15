import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { harness } from "../testing.js";
import { pispi } from "./index.js";

const payer = "8b1b2499-3e50-435b-b757-ac7a83d8aa7f";
const payee = "8b1b2499-3e50-435b-b757-ac7a83d8aa8c";

async function signedIn() {
  const sim = harness(pispi);
  const body = { grant_type: "client_credentials", client_id: "overpass", client_secret: "test" };
  const token = await sim.call("success", { method: "POST", path: "/oauth/token", body });
  const bearer = (token.response.body as { access_token: string }).access_token;
  return (method: "GET" | "POST" | "PUT" | "DELETE", path: string, payload?: unknown) =>
    sim.call("success", {
      method,
      path,
      headers: { authorization: `Bearer ${bearer}` },
      ...(payload === undefined ? {} : { body: payload }),
    });
}

describe("account aliases", () => {
  it("creates, lists, reads and deletes a SHID alias", async () => {
    const as = await signedIn();
    const created = await as("POST", "/piz/v1/comptes/CIC2344256727788288822/alias", {
      type: "SHID",
    });
    const { cle } = created.response.body as { cle: string };
    expect(cle).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(created.response.body).toMatchObject({ type: "SHID", compte: "CIC2344256727788288822" });
    expect(
      (await as("GET", "/piz/v1/comptes/CIC2344256727788288822/alias")).response.body,
    ).toMatchObject({ data: [{ cle }], meta: { total: 1 } });
    expect((await as("GET", `/piz/v1/alias/${cle}`)).response.body).toMatchObject({
      alias: { cle },
      client: { pays: "CI" },
    });
    expect(
      (await as("DELETE", `/piz/v1/comptes/CIC2344256727788288822/alias/${cle}`)).response.status,
    ).toBe(204);
    expect((await as("GET", `/piz/v1/alias/${cle}`)).response.status).toBe(404);
  });

  it("refuses an unknown alias type", async () => {
    const as = await signedIn();
    const result = await as("POST", "/piz/v1/comptes/CIC1/alias", { type: "IBAN" });
    expect(result.response.status).toBe(400);
  });
});

describe("received payments and returns of funds", () => {
  async function paid() {
    const as = await signedIn();
    const request = {
      txId: "tx-r",
      confirmation: false,
      payeurAlias: payer,
      payeAlias: payee,
      montant: 5000,
      categorie: "500",
    };
    const created = await as("POST", "/piz/v1/demandes-paiements", request);
    return { as, end2endId: (created.response.body as { end2endId: string }).end2endId };
  }

  it("lists the payment received once the request is accepted", async () => {
    const { as, end2endId } = await paid();
    expect((await as("GET", "/piz/v1/paiements-recus")).response.body).toMatchObject({
      data: [{ end2endId, statut: "IRREVOCABLE" }],
    });
    expect((await as("GET", "/piz/v1/paiements-recus/tx-r")).response.body).toMatchObject({
      end2endId,
    });
    expect((await as("GET", `/piz/v1/paiements/${end2endId}`)).response.body).toMatchObject({
      statut: "IRREVOCABLE",
    });
  });

  it("returns the full amount once, then answers the same without a second webhook", async () => {
    const { as, end2endId } = await paid();
    const first = await as("PUT", `/piz/v1/paiements/${end2endId}/retours`);
    expect(first.response.body).toMatchObject({ retourStatut: "IRREVOCABLE", montant: 5000 });
    expect(first.webhooks[0]?.event.payload).toMatchObject({
      evCode: "RETOUR_ENVOYE",
      end2endId,
      montant: 5000,
    });
    const second = await as("PUT", `/piz/v1/paiements/${end2endId}/retours`);
    expect(second.response.body).toMatchObject({ retourStatut: "IRREVOCABLE" });
    expect(second.webhooks).toEqual([]);
  });

  it("answers an unknown payment with the documented 404 problem", async () => {
    const as = await signedIn();
    const result = await as("PUT", "/piz/v1/paiements/ECIB00120260101000000AAAAAAAAAAAAAA/retours");
    expect(result.response).toMatchObject({
      status: 404,
      body: { detail: "Paiement inexistant ou déjà archivé" },
    });
  });
});

describe("webhook registrations", () => {
  it("registers an https callback once, lists and deletes it", async () => {
    const as = await signedIn();
    const body = { callbackUrl: "https://shop.example/piz/webhooks", events: ["PAIEMENT_RECU"] };
    const created = await as("POST", "/piz/v1/webhooks", body);
    expect(created.response.status).toBe(201);
    const { id } = created.response.body as { id: string };
    expect((await as("POST", "/piz/v1/webhooks", body)).response.status).toBe(409);
    expect((await as("GET", "/piz/v1/webhooks")).response.body).toMatchObject({
      data: [{ id }],
      meta: { total: 1 },
    });
    expect((await as("DELETE", `/piz/v1/webhooks/${id}`)).response.status).toBe(204);
  });

  it("refuses an http callback", async () => {
    const as = await signedIn();
    expect(
      (await as("POST", "/piz/v1/webhooks", { callbackUrl: "http://shop.example/hook" })).response
        .status,
    ).toBe(400);
  });
});

describe("webhook wire", () => {
  it("posts {data, meta} signed with X-Signature, hex HMAC-SHA256 of the raw body", () => {
    const event = {
      id: "e1",
      type: "PAIEMENT_RECU",
      payload: { evCode: "PAIEMENT_RECU", montant: 400 },
    };
    const rendered = pispi.webhooks.render(event, { secret: "xsk_test", now: new Date() });
    expect(JSON.parse(rendered.body)).toEqual({ data: [event.payload], meta: { total: 1 } });
    expect(rendered.headers["x-signature"]).toBe(
      createHmac("sha256", "xsk_test").update(rendered.body).digest("hex"),
    );
  });
});

describe("identity", () => {
  it("is unofficial, follows spec 1.5.0, points to the official sandbox and warns about mTLS", () => {
    expect(pispi.identity).toMatchObject({ id: "pi-spi", unofficial: true, docsVersion: "1.5.0" });
    expect(pispi.identity.officialSandboxUrl).toMatch(/^https:\/\/developer\.pispi\.bceao\.int/);
    expect(pispi.identity.copy.fr?.warning).toContain("mTLS");
    expect(pispi.steps?.map((step) => step.id)).toEqual(["token", "request", "read"]);
  });
});
