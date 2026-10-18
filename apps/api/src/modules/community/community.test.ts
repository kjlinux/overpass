import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { call, testClock } from "../../testing-routes.js";
import { createTestApp, registerAccount } from "../../testing.js";

let app: FastifyInstance;
let close: () => Promise<void>;
let userCookie: string;

beforeEach(async () => {
  ({ app, close } = await createTestApp({ now: testClock().now }));
  userCookie = await registerAccount(app, "dev@example.com");
});
afterEach(() => close());

describe("community topics", () => {
  it("GET /v1/topics lists seeded topics", async () => {
    const res = await call(app, "GET", "/v1/topics");
    expect(res.status).toBe(200);
    const data = res.body.data as unknown as Array<{ id: string; name: string }>;
    expect(data.length).toBeGreaterThanOrEqual(6);
    expect(data[0]?.name).toBe("Integrations et API");
  });
});

describe("community threads & replies", () => {
  it("creates a thread, lists it, replies and accepts answer", async () => {
    const topicsRes = await call(app, "GET", "/v1/topics");
    const topicId = (topicsRes.body.data as unknown as Array<{ id: string }>)[0]?.id as string;

    const createRes = await call(app, "POST", "/v1/threads", {
      cookie: userCookie,
      payload: {
        topicId,
        title: "Wave webhook delay in production",
        content: "We noticed occasional 15-second delays on Côte d'Ivoire network.",
        language: "fr",
        country: "CI",
        stack: "laravel",
      },
    });
    expect(createRes.status).toBe(201);
    const thread = createRes.body.data as { id: string; title: string };
    expect(thread.id).toBeDefined();

    const listRes = await call(app, "GET", "/v1/threads");
    expect(listRes.status).toBe(200);
    const list = listRes.body.data as unknown as Array<{ id: string; title: string }>;
    expect(list.some((t) => t.id === thread.id)).toBe(true);

    const replyRes = await call(app, "POST", `/v1/threads/${thread.id}/replies`, {
      cookie: userCookie,
      payload: {
        content: "This is usually due to telco retry queues, idempotent handling fixes it.",
      },
    });
    expect(replyRes.status).toBe(201);
    const reply = replyRes.body.data as { id: string };

    const voteRes = await call(app, "POST", `/v1/replies/${reply.id}/useful`, {
      cookie: userCookie,
    });
    expect(voteRes.status).toBe(200);
    expect((voteRes.body.data as { usefulVotes: number }).usefulVotes).toBe(1);

    const acceptRes = await call(app, "POST", `/v1/threads/${thread.id}/accept`, {
      cookie: userCookie,
      payload: { replyId: reply.id },
    });
    expect(acceptRes.status).toBe(200);

    const detailRes = await call(app, "GET", `/v1/threads/${thread.id}`);
    expect(detailRes.status).toBe(200);
    const detail = detailRes.body.data as { acceptedReplyId: string; replies: unknown[] };
    expect(detail.acceptedReplyId).toBe(reply.id);
    expect(detail.replies).toHaveLength(1);
  });
});

describe("community blog", () => {
  it("creates and retrieves a published blog post", async () => {
    const createRes = await call(app, "POST", "/v1/posts", {
      cookie: userCookie,
      payload: {
        title: "How BCEAO PI-SPI changes regional payments",
        summary: "An overview of the new unified instant payment switch in UEMOA.",
        content:
          "PI-SPI connects all banks and electronic money institutions in the 8 UEMOA states.",
        language: "fr",
        category: "news",
      },
    });
    expect(createRes.status).toBe(201);
    const post = createRes.body.data as { slug: string; title: string };

    const listRes = await call(app, "GET", "/v1/posts");
    expect(listRes.status).toBe(200);
    const posts = listRes.body.data as unknown as Array<{ slug: string }>;
    expect(posts.some((p) => p.slug === post.slug)).toBe(true);

    const detailRes = await call(app, "GET", `/v1/posts/${post.slug}`);
    expect(detailRes.status).toBe(200);
    expect((detailRes.body.data as { title: string }).title).toBe(post.title);
  });
});

describe("community newsletter", () => {
  it("handles double opt-in subscribe, confirm and unsubscribe", async () => {
    const subRes = await call(app, "POST", "/v1/newsletter/subscribe", {
      payload: { email: "dev-sub@example.com", language: "fr" },
    });
    expect(subRes.status).toBe(200);
    const { token } = subRes.body.data as { token: string };
    expect(token).toBeDefined();

    const confirmRes = await call(app, "GET", `/v1/newsletter/confirm?token=${token}`);
    expect(confirmRes.status).toBe(200);

    const unsubRes = await call(app, "GET", `/v1/newsletter/unsubscribe?token=${token}`);
    expect(unsubRes.status).toBe(200);
  });
});
