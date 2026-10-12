import { ok } from "@overpass/shared";
import { parseInput } from "../../../http/validate.js";
import { currentAccount } from "../guard.js";
import { limits } from "../limits.js";
import { tokenCreateInput, tokenIdParams } from "../schemas.js";
import type { RouteContext } from "./context.js";

/** Tokens are managed from the web session only: a leaked token cannot mint another. */
export function tokenRoutes({ app, service, auth }: RouteContext): void {
  app.get("/v1/tokens", { preHandler: auth("session") }, async (request) =>
    ok(await service.listTokens(currentAccount(request).id)),
  );

  app.post(
    "/v1/tokens",
    { config: { rateLimit: limits.tokens }, preHandler: auth("session") },
    async (request, reply) => {
      const input = parseInput(tokenCreateInput, request.body);
      const created = await service.createToken(currentAccount(request).id, input);
      return reply.code(201).send(ok(created));
    },
  );

  app.delete("/v1/tokens/:id", { preHandler: auth("session") }, async (request) => {
    const { id } = parseInput(tokenIdParams, request.params);
    await service.revokeToken(currentAccount(request).id, id);
    return ok(null);
  });
}
