import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "../../db/client.js";
import { call } from "../../testing-routes.js";
import { createTestApp, registerAccount } from "../../testing.js";
import { testProvider } from "./fixtures.js";

let app: FastifyInstance;
let db: Database;
let close: () => Promise<void>;
let awa: string;
let kofi: string;
const publicHosts: Record<string, string[]> = {
  "hooks.example.com": ["93.184.216.34"],
  "sneaky.example.com": ["10.0.0.7"],
};

beforeEach(async () => {
  ({ app, db, close } = await createTestApp({
    sandbox: {
      providers: [testProvider],
      resolveHost: (host) => Promise.resolve(publicHosts[host] ?? []),
    },
  }));
  awa = await registerAccount(app, "awa@example.com");
  kofi = await registerAccount(app, "kofi@example.com");
});
afterEach(() => close());

const createKey = (cookie: string, payload: object = { provider: "fake" }) =>
  call(app, "POST", "/v1/sandbox/keys", { cookie, payload });

describe("POST /v1/sandbox/keys", () => {
  it("requires a session", async () => {
    const response = await call(app, "POST", "/v1/sandbox/keys", { payload: { provider: "fake" } });
    expect(response.status).toBe(401);
  });

  it("returns the key once and stores only its digest", async () => {
    const response = await createKey(awa);
    expect(response.status).toBe(201);
    const key = response.body.data as Record<string, string>;
    expect(key.key).toMatch(/^ovp_test_[\w-]{32}$/);
    expect(key.key?.startsWith(key.prefix ?? "-")).toBe(true);
    expect(key).toMatchObject({
      provider: "fake",
      scenario: "success",
      target: "inbox",
      webhookUrl: null,
    });
    expect(key.webhookSecret).toMatch(/^fake_whs_/);
    const digest = createHash("sha256")
      .update(key.key ?? "")
      .digest("hex");
    const rows = await db.execute(sql`select key_hash from sandbox_keys`);
    expect(JSON.stringify(rows)).toContain(digest);
    expect(JSON.stringify(rows)).not.toContain(key.key);
  });

  it("expires the key after 30 days", async () => {
    const key = (await createKey(awa)).body.data as { expiresAt: string; createdAt: string };
    const days = (Date.parse(key.expiresAt) - Date.parse(key.createdAt)) / 86_400_000;
    expect(Math.round(days)).toBe(30);
  });

  it("refuses a provider without a simulator", async () => {
    const response = await createKey(awa, { provider: "orange-money" });
    expect(response.status).toBe(400);
    expect(JSON.stringify(response.body.error)).toContain("provider_not_simulated");
  });

  it("asks for a URL when webhooks go to a URL", async () => {
    const response = await createKey(awa, { provider: "fake", target: "url" });
    expect(JSON.stringify(response.body.error)).toContain("webhook_url_required");
  });

  it.each([
    "http://127.0.0.1/hook",
    "http://localhost:3000/hook",
    "https://[::1]/x",
    "https://sneaky.example.com/x",
    "https://unknown.example.com/x",
  ])("refuses the private or unresolvable webhook URL %s", async (webhookUrl) => {
    const response = await createKey(awa, { provider: "fake", target: "url", webhookUrl });
    expect(response.status).toBe(400);
    expect(JSON.stringify(response.body.error)).toContain("webhook_url_private");
  });

  it("accepts a public webhook URL", async () => {
    const webhookUrl = "https://hooks.example.com/overpass";
    const response = await createKey(awa, { provider: "fake", target: "url", webhookUrl });
    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ target: "url", webhookUrl });
  });

  it("caps active keys at five per account", async () => {
    for (let index = 0; index < 5; index += 1) expect((await createKey(awa)).status).toBe(201);
    const response = await createKey(awa);
    expect(response.status).toBe(409);
    expect(response.body.error?.code).toBe("sandbox_key_limit");
  });
});

describe("managing keys", () => {
  it("lists only the caller's keys, without the secret key", async () => {
    await createKey(awa);
    await createKey(kofi);
    const response = await call(app, "GET", "/v1/sandbox/keys", { cookie: awa });
    const keys = response.body.data as unknown as Record<string, unknown>[];
    expect(keys).toHaveLength(1);
    expect(keys[0]).not.toHaveProperty("key");
  });

  it("changes the scenario and the target of a key", async () => {
    const { id } = (await createKey(awa)).body.data as { id: string };
    const payload = { scenario: "late_webhook", target: "relay" };
    const response = await call(app, "PATCH", `/v1/sandbox/keys/${id}`, { cookie: awa, payload });
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject(payload);
  });

  it("hides another developer's key", async () => {
    const { id } = (await createKey(awa)).body.data as { id: string };
    const payload = { scenario: "timeout" };
    expect(
      (await call(app, "PATCH", `/v1/sandbox/keys/${id}`, { cookie: kofi, payload })).status,
    ).toBe(404);
    expect((await call(app, "DELETE", `/v1/sandbox/keys/${id}`, { cookie: kofi })).status).toBe(
      404,
    );
  });

  it("revokes a key, which frees a slot", async () => {
    const { id } = (await createKey(awa)).body.data as { id: string };
    expect((await call(app, "DELETE", `/v1/sandbox/keys/${id}`, { cookie: awa })).status).toBe(204);
    const keys = (await call(app, "GET", "/v1/sandbox/keys", { cookie: awa })).body.data;
    expect(keys).toEqual([]);
  });
});

describe("GET /v1/sandbox/providers", () => {
  it("lists the loaded providers in the caller's language, marked unofficial", async () => {
    const response = await call(app, "GET", "/v1/sandbox/providers", { language: "en" });
    expect(response.body.data).toEqual([
      expect.objectContaining({
        id: "fake",
        unofficial: true,
        summary: "Test provider",
        notes: ["Note en"],
        officialSandboxUrl: null,
      }),
    ]);
  });
});
