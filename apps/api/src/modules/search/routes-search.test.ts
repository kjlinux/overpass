import { highlightStart } from "@overpass/shared";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { writePost } from "../../testing-blog.js";
import { openThread, replyTo } from "../../testing-discussions.js";
import { call, publishRoute, testClock } from "../../testing-routes.js";
import { createTestApp, registerAccount } from "../../testing.js";

let app: FastifyInstance;
let close: () => Promise<void>;
let ada: string;

beforeEach(async () => {
  const clock = testClock();
  ({ app, close } = await createTestApp({ now: clock.now }));
  ada = await registerAccount(app, "ada@example.com");
});
afterEach(() => close());

type Hit = { id: string; title: string; snippet: string; language: string };
type Group = { items: Hit[]; nextCursor: string | null };

async function search(query: string): Promise<Record<string, Group>> {
  const { status, body } = await call(app, "GET", `/v1/search?${query}`);
  if (status !== 200) throw new Error(`search failed with ${String(status)}`);
  return body.data as unknown as Record<string, Group>;
}

const titles = (group: Group | undefined) => (group?.items ?? []).map((hit) => hit.title);

describe("GET /v1/search", () => {
  it("finds an English article from a French interface, in every kind", async () => {
    await writePost(app, ada, { language: "en", title: "Collecting payments with Wave" });
    await openThread(app, ada, { title: "Webhook Wave jamais reçu en local" });
    await publishRoute(app, ada);
    const groups = await search("q=wave&lang=fr");
    expect(titles(groups.posts)).toEqual(["Collecting payments with Wave"]);
    expect(titles(groups.threads)).toEqual(["Webhook Wave jamais reçu en local"]);
    expect(titles(groups.routes)).toEqual(["Encaisser un paiement Wave Checkout depuis Laravel"]);
  });

  it("matches word forms without accents, and a thread through one of its replies", async () => {
    const thread = await openThread(app, ada, { title: "Les paiements sur le réseau Orange" });
    await replyTo(app, ada, thread, "Essayez le simulateur CinetPay avant la production.");
    expect(titles((await search("q=paiement+reseau")).threads)).toHaveLength(1);
    const viaReply = (await search("q=cinetpay")).threads?.items[0];
    expect(viaReply?.snippet).toContain(`${highlightStart}CinetPay`);
  });

  it("forgives a missing letter in a title", async () => {
    await writePost(app, ada, { title: "Intégrer Flutterwave en Node" });
    expect(titles((await search("q=flutterwve")).posts)).toEqual(["Intégrer Flutterwave en Node"]);
  });

  it("never returns a draft or a deleted itinerary", async () => {
    await writePost(app, ada, { title: "Brouillon sur Paystack", status: "draft" });
    const route = await publishRoute(app, ada, { title: "Encaisser avec Paystack depuis Django" });
    await call(app, "DELETE", `/v1/routes/${route}`, { cookie: ada });
    const groups = await search("q=paystack");
    expect([...titles(groups.posts), ...titles(groups.routes)]).toEqual([]);
  });

  it("ranks the reader's language first and pages one kind", async () => {
    await writePost(app, ada, { title: "Tester les SMS avec Termii" });
    await writePost(app, ada, { language: "en", title: "Testing SMS with Termii" });
    const first = (await search("q=termii&lang=en&kind=posts&limit=1")).posts;
    expect(titles(first)).toEqual(["Testing SMS with Termii"]);
    const cursor = encodeURIComponent(String(first?.nextCursor));
    const second = await search(`q=termii&lang=en&kind=posts&limit=1&cursor=${cursor}`);
    expect(titles(second.posts)).toEqual(["Tester les SMS avec Termii"]);
    expect(second.threads).toBeUndefined();
  });

  it("refuses a query under two characters", async () => {
    const { status, body } = await call(app, "GET", "/v1/search?q=a");
    expect(status).toBe(400);
    expect(body.error?.code).toBe("validation_failed");
  });
});
