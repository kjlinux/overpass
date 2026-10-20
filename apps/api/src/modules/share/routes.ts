import type { FastifyInstance, FastifyReply } from "fastify";
import { webContentSecurityPolicy } from "../../http/security-headers.js";
import { postPageParams, routePageParams } from "./schemas.js";
import type { ShareService } from "./service.js";

const minute = 60 * 1000;

/** Same per-IP budget as the other public reads. */
const limits = { read: { max: 120, timeWindow: minute } };

function sendPage(reply: FastifyReply, html: string): FastifyReply {
  return reply
    .header("content-type", "text/html; charset=utf-8")
    .header("cache-control", "public, max-age=300")
    .header("content-security-policy", webContentSecurityPolicy)
    .send(html);
}

/** The two content pages a link preview reads; an unsupported language is a plain 404. */
export function registerShareRoutes(app: FastifyInstance, service: ShareService): void {
  const options = { config: { rateLimit: limits.read } };
  app.get("/:lang/routes/:id", options, async (request, reply) => {
    const params = routePageParams.safeParse(request.params);
    if (!params.success) {
      reply.callNotFound();
      return reply;
    }
    return sendPage(reply, await service.routePage(params.data.lang, params.data.id));
  });
  app.get("/:lang/blog/:slug", options, async (request, reply) => {
    const params = postPageParams.safeParse(request.params);
    if (!params.success) {
      reply.callNotFound();
      return reply;
    }
    return sendPage(reply, await service.postPage(params.data.lang, params.data.slug));
  });
}
