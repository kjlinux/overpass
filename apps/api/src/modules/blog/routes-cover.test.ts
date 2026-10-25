import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { confirmMember, samplePost, writePost } from "../../testing-blog.js";
import { samplePng, upload } from "../../testing-media.js";
import { call } from "../../testing-routes.js";
import { createTestApp, registerAccount } from "../../testing.js";

let app: FastifyInstance;
let close: () => Promise<void>;
let ada: string;
let bob: string;

beforeEach(async () => {
  ({ app, close } = await createTestApp());
  ada = await registerAccount(app, "ada@example.com");
  await confirmMember(app, ada);
  bob = await registerAccount(app, "bob@example.com", "SN");
});
afterEach(() => close());

const imageOf = async (cookie: string) => (await upload(app, samplePng, { cookie })).body.data;

describe("the cover image of a post", () => {
  it("shows the cover the author uploaded, in the post and in the lists", async () => {
    const image = await imageOf(ada);
    const created = await call(app, "POST", "/v1/posts", {
      cookie: ada,
      payload: { ...samplePost, status: "published", coverMediaId: image?.id },
    });
    expect(created.body.data).toMatchObject({ cover: image?.url });
    const list = await call(app, "GET", "/v1/posts");
    const items = (list.body.data as { items: { cover: string | null }[] }).items;
    expect(items[0]?.cover).toBe(image?.url);
  });

  it("has no cover by default and can drop one", async () => {
    const { id } = await writePost(app, ada, { coverMediaId: (await imageOf(ada))?.id });
    const removed = await call(app, "PATCH", `/v1/posts/${id}`, {
      cookie: ada,
      payload: { coverMediaId: null },
    });
    expect(removed.body.data).toMatchObject({ cover: null });
    const plain = await call(app, "POST", "/v1/posts", {
      cookie: ada,
      payload: { ...samplePost, title: "Un second article sans couverture" },
    });
    expect(plain.body.data).toMatchObject({ cover: null });
  });

  it("refuses an image that belongs to someone else", async () => {
    const other = await imageOf(bob);
    const refused = await call(app, "POST", "/v1/posts", {
      cookie: ada,
      payload: { ...samplePost, coverMediaId: other?.id },
    });
    expect(refused.status).toBe(400);
    expect(refused.body.error).toMatchObject({
      fields: { coverMediaId: { code: "cover_invalid" } },
    });
  });
});
