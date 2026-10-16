import type { FastifyInstance } from "fastify";
import type { AccountResolver } from "../accounts/index.js";
import { moderationRoutes } from "./routes/moderation.js";
import { readRoutes, writeRoutes } from "./routes/posts.js";
import { socialRoutes } from "./routes/social.js";
import type { BlogService } from "./service.js";

/** HTTP surface of the module; handlers only parse, delegate and shape the envelope. */
export function registerBlogRoutes(
  app: FastifyInstance,
  service: BlogService,
  resolve: AccountResolver,
): void {
  app.addHook("onSend", async (_request, reply) => {
    if (!reply.hasHeader("cache-control")) reply.header("cache-control", "no-store");
  });
  const context = { app, service, resolve };
  readRoutes(context);
  writeRoutes(context);
  socialRoutes(context);
  moderationRoutes(context);
}
