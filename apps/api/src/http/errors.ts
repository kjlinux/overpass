import { errorMessage, fail, pickLanguage } from "@overpass/shared";
import type { FastifyInstance } from "fastify";

/** Answers unknown routes and unexpected failures with translated envelopes. */
export function registerErrorHandlers(app: FastifyInstance): void {
  app.setNotFoundHandler((request, reply) => {
    const language = pickLanguage(request.headers["accept-language"]);
    return reply
      .code(404)
      .send(fail({ code: "not_found", message: errorMessage("not_found", language) }));
  });
  app.setErrorHandler((error, request, reply) => {
    request.log.error({ err: error }, "unhandled error");
    const language = pickLanguage(request.headers["accept-language"]);
    return reply
      .code(500)
      .send(fail({ code: "internal", message: errorMessage("internal", language) }));
  });
}
