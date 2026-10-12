import { ok } from "@overpass/shared";
import { parseInput } from "../../../http/validate.js";
import { currentAccount } from "../guard.js";
import { limits } from "../limits.js";
import {
  accountDeleteInput,
  handleParams,
  passwordChangeInput,
  profileUpdateInput,
  toMe,
} from "../schemas.js";
import type { RouteContext } from "./context.js";

export function meRoutes({ app, service, cookies, auth }: RouteContext): void {
  app.get("/v1/me", { preHandler: auth("session-or-token") }, (request) =>
    ok(toMe(currentAccount(request))),
  );

  app.patch("/v1/me", { preHandler: auth("session") }, async (request) => {
    const input = parseInput(profileUpdateInput, request.body);
    return ok(toMe(await service.updateProfile(currentAccount(request).id, input)));
  });

  app.put(
    "/v1/me/password",
    { config: { rateLimit: limits.password }, preHandler: auth("session") },
    async (request, reply) => {
      const input = parseInput(passwordChangeInput, request.body);
      const { user, session } = await service.changePassword(currentAccount(request), input);
      cookies.set(reply, session);
      return ok(toMe(user));
    },
  );

  app.delete(
    "/v1/me",
    { config: { rateLimit: limits.deletion }, preHandler: auth("session") },
    async (request, reply) => {
      await service.deleteAccount(
        currentAccount(request),
        parseInput(accountDeleteInput, request.body),
      );
      cookies.clear(reply);
      return ok(null);
    },
  );

  app.get("/v1/users/:handle", async (request) => {
    const { handle } = parseInput(handleParams, request.params);
    return ok(await service.publicProfile(handle));
  });
}
