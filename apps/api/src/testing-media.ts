import type { FastifyInstance } from "fastify";
import { webOrigin } from "./testing.js";

const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export const samplePng = Buffer.from([...pngSignature, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
export const sampleJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46]);
export const sampleWebp = Buffer.concat([
  Buffer.from("RIFF"),
  Buffer.from([36, 0, 0, 0]),
  Buffer.from("WEBPVP8 "),
]);
export const fakePng = Buffer.from("this is not an image at all");

type Uploaded = { data: { id: string; url: string } | null; error: { code: string } | null };

/** Sends raw bytes the way the editor does, with the declared type and an optional session. */
export async function upload(
  app: FastifyInstance,
  bytes: Buffer,
  options: { cookie?: string; type?: string } = {},
) {
  const response = await app.inject({
    method: "POST",
    url: "/v1/media",
    headers: {
      origin: webOrigin,
      "content-type": options.type ?? "image/png",
      ...(options.cookie === undefined ? {} : { cookie: options.cookie }),
    },
    payload: bytes,
  });
  return { status: response.statusCode, body: response.json<Uploaded>() };
}
