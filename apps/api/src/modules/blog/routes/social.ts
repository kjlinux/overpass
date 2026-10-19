import { ok } from "@overpass/shared";
import { parseInput } from "../../../http/validate.js";
import { requireAccount } from "../../accounts/index.js";
import { commentCreateInput, commentsQuery, handleParams, idParams } from "../schemas.js";
import { limits } from "./context.js";
import type { Context } from "./context.js";

export function socialRoutes({ app, service, resolve }: Context): void {
  const clicks = { config: { rateLimit: limits.click } };
  app.get("/v1/posts/:id/comments", { config: { rateLimit: limits.read } }, async (request) => {
    const { id } = parseInput(idParams, request.params);
    const { cursor } = parseInput(commentsQuery, request.query);
    return ok(await service.comments(id, cursor, await resolve(request)));
  });
  const commentOptions = { config: { rateLimit: limits.comment } };
  app.post("/v1/posts/:id/comments", commentOptions, async (request, reply) => {
    const account = await requireAccount(resolve, request);
    const { id } = parseInput(idParams, request.params);
    const input = parseInput(commentCreateInput, request.body);
    return reply.code(201).send(ok(await service.comment(account, id, input)));
  });
  app.post("/v1/posts/:id/star", clicks, async (request) => {
    const account = await requireAccount(resolve, request);
    return ok(await service.star(account, parseInput(idParams, request.params).id));
  });
  app.delete("/v1/posts/:id/star", clicks, async (request) => {
    const account = await requireAccount(resolve, request);
    return ok(await service.unstar(account, parseInput(idParams, request.params).id));
  });
  app.post("/v1/blogs/:handle/follow", clicks, async (request) => {
    const account = await requireAccount(resolve, request);
    return ok(await service.follow(account, parseInput(handleParams, request.params).handle));
  });
  app.delete("/v1/blogs/:handle/follow", clicks, async (request) => {
    const account = await requireAccount(resolve, request);
    return ok(await service.unfollow(account, parseInput(handleParams, request.params).handle));
  });
  app.get("/v1/me/follows", async (request) =>
    ok(await service.following(await requireAccount(resolve, request))),
  );
}
