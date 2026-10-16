import { ok } from "@overpass/shared";
import { parseInput } from "../../../http/validate.js";
import { requireAccount } from "../../accounts/index.js";
import {
  blogModerationInput,
  blogModerationParams,
  blogSuspensionInput,
  handleParams,
  idParams,
} from "../schemas.js";
import { limits } from "./context.js";
import type { Context } from "./context.js";

export function moderationRoutes({ app, service, resolve }: Context): void {
  const clicks = { config: { rateLimit: limits.click } };
  for (const kind of ["post", "comment"] as const) {
    const path = kind === "post" ? "/v1/posts/:id/reports" : "/v1/comments/:id/reports";
    app.post(path, clicks, async (request, reply) => {
      const account = await requireAccount(resolve, request);
      const { id } = parseInput(idParams, request.params);
      return reply.code(201).send(ok(await service.report(account, kind, id)));
    });
  }
  app.get("/v1/moderation/blog", async (request) =>
    ok(await service.queue(await requireAccount(resolve, request))),
  );
  app.post("/v1/moderation/blog/:kind/:id", async (request) => {
    const account = await requireAccount(resolve, request);
    const { kind, id } = parseInput(blogModerationParams, request.params);
    const { action } = parseInput(blogModerationInput, request.body);
    return ok(await service.moderate(account, kind, id, action));
  });
  app.post("/v1/moderation/blogs/:handle/suspension", async (request) => {
    const account = await requireAccount(resolve, request);
    const { handle } = parseInput(handleParams, request.params);
    const { suspended } = parseInput(blogSuspensionInput, request.body);
    return ok(await service.suspend(account, handle, suspended));
  });
}
