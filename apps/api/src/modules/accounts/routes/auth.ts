import { ok, pickLanguage } from "@overpass/shared";
import { parseInput } from "../../../http/validate.js";
import { addressLimiter, limits } from "../limits.js";
import { forgotInput, loginInput, registerInput, resetInput, toMe } from "../schemas.js";
import type { RouteContext } from "./context.js";

export function authRoutes({ app, service, cookies }: RouteContext): void {
  app.post(
    "/v1/auth/register",
    { config: { rateLimit: limits.register } },
    async (request, reply) => {
      const input = parseInput(registerInput, request.body);
      const language = pickLanguage(request.headers["accept-language"]);
      const { user, session } = await service.register(input, language);
      cookies.set(reply, session);
      return reply.code(201).send(ok(toMe(user)));
    },
  );

  app.post(
    "/v1/auth/login",
    { config: { rateLimit: limits.login }, preHandler: addressLimiter(app, "login") },
    async (request, reply) => {
      const { user, session } = await service.login(parseInput(loginInput, request.body));
      cookies.set(reply, session);
      return reply.send(ok(toMe(user)));
    },
  );

  app.post("/v1/auth/logout", { config: { rateLimit: limits.logout } }, (_request, reply) => {
    cookies.clear(reply);
    return reply.send(ok(null));
  });
}

export function recoveryRoutes({ app, service }: RouteContext): void {
  app.post(
    "/v1/auth/forgot",
    { config: { rateLimit: limits.forgot }, preHandler: addressLimiter(app, "forgot") },
    async (request, reply) => {
      await service.requestReset(parseInput(forgotInput, request.body));
      return reply.code(202).send(ok(null));
    },
  );

  app.post("/v1/auth/reset", { config: { rateLimit: limits.reset } }, async (request) => {
    await service.resetPassword(parseInput(resetInput, request.body));
    return ok(null);
  });
}
