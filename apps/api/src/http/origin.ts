import type { FastifyInstance } from "fastify";
import { sendError } from "./errors.js";

const unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** CSRF guard: browsers send Origin on these methods, so a foreign or missing one is refused. */
export function registerOriginCheck(app: FastifyInstance, webOrigin: string): void {
  const allowed = new URL(webOrigin).origin;
  app.addHook("onRequest", async (request, reply) => {
    if (!unsafeMethods.has(request.method)) return;
    const origin = request.headers.origin;
    const refused =
      origin === undefined ? request.headers.cookie !== undefined : origin !== allowed;
    if (refused) await sendError(request, reply, { code: "forbidden_origin", status: 403 });
  });
}
