import { ok } from "@overpass/shared";
import type { FastifyInstance } from "fastify";
import { parseInput } from "../../http/validate.js";
import { requireAccount } from "../accounts/index.js";
import type { AccountResolver } from "../accounts/index.js";
import { acceptedTypes, mediaMaxBytes, mediaParams } from "./schemas.js";
import type { MediaService } from "./service.js";

const minute = 60 * 1000;
const hour = 60 * minute;

/** Per-IP budgets: an article holds a few images, readers load many. */
const limits = { upload: { max: 30, timeWindow: hour }, read: { max: 600, timeWindow: minute } };

const immutable = "public, max-age=31536000, immutable";

/** HTTP surface of the module; the body arrives as raw bytes, capped before it is buffered. */
export function registerMediaRoutes(
  app: FastifyInstance,
  service: MediaService,
  resolve: AccountResolver,
): void {
  app.addContentTypeParser([...acceptedTypes], { parseAs: "buffer" }, (_request, body, done) => {
    done(null, body);
  });
  const upload = { bodyLimit: mediaMaxBytes, config: { rateLimit: limits.upload } };
  app.post("/v1/media", upload, async (request, reply) => {
    const account = await requireAccount(resolve, request);
    const bytes = Buffer.isBuffer(request.body) ? request.body : Buffer.alloc(0);
    return reply.code(201).send(ok(await service.upload(account, bytes)));
  });
  app.get("/v1/media/:id", { config: { rateLimit: limits.read } }, async (request, reply) => {
    const { id } = parseInput(mediaParams, request.params);
    const media = await service.read(id);
    reply.type(media.mime).header("cache-control", immutable);
    return reply.header("content-disposition", "inline").send(media.bytes);
  });
}
