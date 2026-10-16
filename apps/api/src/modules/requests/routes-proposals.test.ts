import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "../../db/client.js";
import type { captureMailer } from "../../mail/testing.js";
import { call, testClock } from "../../testing-routes.js";
import { promoteAdmin } from "../../testing-discussions.js";
import { createTestApp, registerAccount } from "../../testing.js";

let app: FastifyInstance;
let db: Database;
let mailer: ReturnType<typeof captureMailer>;
let close: () => Promise<void>;
let awa: string;
let admin: string;

const proposal = {
  name: "M-Pesa Tanzanie",
  category: "payment",
  country: "TZ",
  docsUrl: "https://developer.mpesa.vm.co.tz/",
};

beforeEach(async () => {
  ({ app, db, mailer, close } = await createTestApp({ now: testClock().now }));
  awa = await registerAccount(app, "awa@example.com");
  admin = await registerAccount(app, "admin@example.com");
  await promoteAdmin(db, "admin@example.com");
});
afterEach(() => close());

const propose = (payload: object = proposal, cookie = awa) =>
  call(app, "POST", "/v1/service-proposals", { cookie, payload });

const decide = (id: string, payload: object, cookie = admin) =>
  call(app, "POST", `/v1/admin/service-proposals/${id}`, { cookie, payload });

describe("POST /v1/service-proposals", () => {
  it("requires a session and a public https documentation", async () => {
    expect((await call(app, "POST", "/v1/service-proposals", { payload: proposal })).status).toBe(
      401,
    );
    const http = await propose({ ...proposal, docsUrl: "http://intranet.local/doc" });
    expect(http.status).toBe(400);
    expect(JSON.stringify(http.body.error)).toContain("docs_url_invalid");
  });

  it("refuses a service already in the catalogue", async () => {
    const response = await propose({ ...proposal, name: "Wave" });
    expect(response.body.error).toMatchObject({ code: "service_exists" });
  });

  it("queues a pending proposal shown in my proposals", async () => {
    const created = await propose();
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ status: "pending", service: null });
    const mine = await call(app, "GET", "/v1/me/service-proposals", { cookie: awa });
    expect(mine.body.data).toEqual([expect.objectContaining({ name: "M-Pesa Tanzanie" })]);
  });
});

describe("admin review of proposals", () => {
  it("is reserved to admins", async () => {
    const id = String((await propose()).body.data?.id);
    expect((await call(app, "GET", "/v1/admin/service-proposals", { cookie: awa })).status).toBe(
      403,
    );
    expect((await decide(id, { decision: "accept" }, awa)).body.error).toMatchObject({
      code: "admin_only",
    });
  });

  it("accepts a proposal: the service joins the catalogue and the member is told", async () => {
    const id = String((await propose()).body.data?.id);
    const queue = await call(app, "GET", "/v1/admin/service-proposals", { cookie: admin });
    expect(queue.body.data).toEqual([expect.objectContaining({ id, status: "pending" })]);
    const accepted = await decide(id, { decision: "accept" });
    expect(accepted.body.data).toMatchObject({ status: "accepted", service: "m-pesa-tanzanie" });
    const services = (await call(app, "GET", "/v1/services")).body.data as unknown as {
      slug: string;
      simulated: boolean;
    }[];
    expect(services).toContainEqual(
      expect.objectContaining({ slug: "m-pesa-tanzanie", simulated: false }),
    );
    const mail = mailer.sent.findLast((message) => message.to === "awa@example.com");
    expect(mail?.text).toContain("M-Pesa Tanzanie");
    expect((await decide(id, { decision: "reject" })).body.error).toMatchObject({
      code: "proposal_decided",
    });
  });

  it("rejects a proposal with a reason sent to the member", async () => {
    const id = String((await propose()).body.data?.id);
    const rejected = await decide(id, { decision: "reject", reason: "Documentation privée." });
    expect(rejected.body.data).toMatchObject({
      status: "rejected",
      reason: "Documentation privée.",
    });
    const mail = mailer.sent.findLast((message) => message.to === "awa@example.com");
    expect(mail?.text).toContain("Documentation privée.");
    const queue = await call(app, "GET", "/v1/admin/service-proposals", { cookie: admin });
    expect(queue.body.data).toEqual([]);
  });
});
