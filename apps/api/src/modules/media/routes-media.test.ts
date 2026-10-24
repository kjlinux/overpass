import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, registerAccount } from "../../testing.js";
import { mediaMaxBytes } from "./schemas.js";
import { fakePng, samplePng, sampleWebp, upload } from "../../testing-media.js";

let app: FastifyInstance;
let close: () => Promise<void>;
let ada: string;

beforeEach(async () => {
  ({ app, close } = await createTestApp());
  ada = await registerAccount(app, "ada@example.com");
});
afterEach(() => close());

describe("uploading an image", () => {
  it("stores the image of a member and serves it back, byte for byte, at its address", async () => {
    const created = await upload(app, samplePng, { cookie: ada });
    expect(created.status).toBe(201);
    const { id, url } = created.body.data ?? { id: "", url: "" };
    expect(url).toBe(`/v1/media/${id}`);
    const served = await app.inject({ method: "GET", url });
    expect(served.statusCode).toBe(200);
    expect(served.headers["content-type"]).toBe("image/png");
    expect(served.headers["cache-control"]).toBe("public, max-age=31536000, immutable");
    expect(served.headers["x-content-type-options"]).toBe("nosniff");
    expect(served.rawPayload.equals(samplePng)).toBe(true);
  });

  it("keeps the type read from the bytes, not the declared one", async () => {
    const created = await upload(app, sampleWebp, { cookie: ada, type: "image/png" });
    const served = await app.inject({ method: "GET", url: created.body.data?.url ?? "" });
    expect(served.headers["content-type"]).toBe("image/webp");
  });

  it("asks for a session", async () => {
    expect((await upload(app, samplePng)).status).toBe(401);
  });

  it("refuses bytes that are not an image, an SVG and a file over the size limit", async () => {
    expect((await upload(app, fakePng, { cookie: ada })).body.error?.code).toBe("image_invalid");
    const svg = await upload(app, Buffer.from("<svg/>"), { cookie: ada, type: "image/svg+xml" });
    expect(svg.status).toBe(415);
    const big = Buffer.concat([samplePng, Buffer.alloc(mediaMaxBytes)]);
    expect((await upload(app, big, { cookie: ada })).status).toBe(413);
  });

  it("answers an unknown or malformed address with not found", async () => {
    const unknown = "/v1/media/7c7c5d0e-4a8f-4d6a-9b0e-2f1c9d3a1b11";
    expect((await app.inject({ method: "GET", url: unknown })).statusCode).toBe(404);
    expect((await app.inject({ method: "GET", url: "/v1/media/nope" })).statusCode).toBe(400);
  });
});
