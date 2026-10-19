import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { call, sampleRoute, testClock } from "../../testing-routes.js";
import { openThread, readThread, replyTo } from "../../testing-discussions.js";
import { createTestApp, registerAccount } from "../../testing.js";

let app: FastifyInstance;
let close: () => Promise<void>;
let asker: string;
let helper: string;
let threadId: string;

beforeEach(async () => {
  ({ app, close } = await createTestApp({ now: testClock().now }));
  asker = await registerAccount(app, "asker@example.com");
  helper = await registerAccount(app, "helper@example.com");
  threadId = await openThread(app, asker, { topic: "integrations" });
});
afterEach(() => close());

const publishFrom = (cookie: string) =>
  call(app, "POST", "/v1/routes", { cookie, payload: { ...sampleRoute, sourceThread: threadId } });

async function resolve(): Promise<void> {
  const reply = await replyTo(app, helper, threadId);
  await call(app, "POST", `/v1/threads/${threadId}/accept`, {
    cookie: asker,
    payload: { reply },
  });
}

describe("turning a resolved thread into a route", () => {
  it("refuses an open thread", async () => {
    const response = await publishFrom(asker);
    expect(response.status).toBe(409);
    expect(response.body.error).toMatchObject({ code: "thread_not_resolved" });
  });

  it("is reserved to the author of the thread", async () => {
    await resolve();
    expect((await publishFrom(helper)).body.error).toMatchObject({ code: "not_thread_author" });
  });

  it("offers the action once, then links the thread to its route", async () => {
    await resolve();
    const before = (await readThread(app, threadId, asker)).body.data;
    expect(before).toMatchObject({ viewer: { canTransform: true }, transformedRoute: null });
    const created = await publishFrom(asker);
    expect(created.status).toBe(201);
    const after = (await readThread(app, threadId, asker)).body.data;
    expect(after).toMatchObject({
      transformedRoute: created.body.data?.id,
      viewer: { canTransform: false },
    });
    expect((await publishFrom(asker)).body.error).toMatchObject({ code: "already_transformed" });
  });

  it("answers 404 for an unknown thread", async () => {
    const response = await call(app, "POST", "/v1/routes", {
      cookie: asker,
      payload: { ...sampleRoute, sourceThread: "00000000-0000-4000-8000-000000000099" },
    });
    expect(response.status).toBe(404);
  });
});
