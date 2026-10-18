import {
  newsletterSubscribeInput,
  ok,
  postCreateInput,
  replyCreateInput,
  threadCreateInput,
} from "@overpass/shared";
import type { FastifyInstance } from "fastify";
import { AppError } from "../../http/app-error.js";
import { parseInput } from "../../http/validate.js";
import type { AccountResolver } from "../accounts/index.js";
import type { CommunityService } from "./service.js";

type Context = {
  app: FastifyInstance;
  service: CommunityService;
  resolve: AccountResolver;
};

function registerDiscussionRoutes({ app, service, resolve }: Context): void {
  app.get("/v1/topics", async () => ok(await service.listTopics()));

  app.get("/v1/threads", async (request) => {
    const query = request.query as { topicId?: string; language?: string } | undefined;
    return ok(await service.listThreads(query ?? {}));
  });

  app.post("/v1/threads", async (request, reply) => {
    const account = await resolve(request);
    if (!account) throw new AppError("unauthorized", 401);
    const input = parseInput(threadCreateInput, request.body);
    const thread = await service.createThread(account.id, input);
    return reply.code(201).send(ok(thread));
  });

  app.get("/v1/threads/:id", async (request) => {
    const { id } = request.params as { id: string };
    return ok(await service.getThread(id));
  });
}

function registerReplyRoutes({ app, service, resolve }: Context): void {
  app.post("/v1/threads/:id/replies", async (request, reply) => {
    const account = await resolve(request);
    if (!account) throw new AppError("unauthorized", 401);
    const { id } = request.params as { id: string };
    const input = parseInput(replyCreateInput, request.body);
    const created = await service.createReply(account.id, id, input);
    return reply.code(201).send(ok(created));
  });

  app.post("/v1/replies/:id/useful", async (request) => {
    const account = await resolve(request);
    if (!account) throw new AppError("unauthorized", 401);
    const { id } = request.params as { id: string };
    return ok(await service.voteReply(id));
  });

  app.post("/v1/threads/:id/accept", async (request) => {
    const account = await resolve(request);
    if (!account) throw new AppError("unauthorized", 401);
    const { id } = request.params as { id: string };
    const { replyId } = (request.body ?? {}) as { replyId?: string };
    if (!replyId) throw new AppError("bad_request", 400);
    await service.acceptReply(account.id, id, replyId);
    return ok({ accepted: true });
  });
}

function registerPostRoutes({ app, service, resolve }: Context): void {
  app.get("/v1/posts", async (request) => {
    const query = request.query as { language?: string; category?: string } | undefined;
    return ok(await service.listPosts(query ?? {}));
  });

  app.get("/v1/posts/:slug", async (request) => {
    const { slug } = request.params as { slug: string };
    return ok(await service.getPost(slug));
  });

  app.post("/v1/posts", async (request, reply) => {
    const account = await resolve(request);
    if (!account) throw new AppError("unauthorized", 401);
    const input = parseInput(postCreateInput, request.body);
    const post = await service.createPost(account.id, input);
    return reply.code(201).send(ok(post));
  });
}

function registerNewsletterRoutes({ app, service }: Context): void {
  app.post("/v1/newsletter/subscribe", async (request) => {
    const input = parseInput(newsletterSubscribeInput, request.body);
    return ok(await service.subscribeNewsletter(input));
  });

  app.get("/v1/newsletter/confirm", async (request) => {
    const { token } = (request.query ?? {}) as { token?: string };
    if (!token) throw new AppError("bad_request", 400);
    return ok(await service.confirmNewsletter(token));
  });

  app.get("/v1/newsletter/unsubscribe", async (request) => {
    const { token } = (request.query ?? {}) as { token?: string };
    if (!token) throw new AppError("bad_request", 400);
    return ok(await service.unsubscribeNewsletter(token));
  });
}

export function registerCommunityRoutes(ctx: Context): void {
  registerDiscussionRoutes(ctx);
  registerReplyRoutes(ctx);
  registerPostRoutes(ctx);
  registerNewsletterRoutes(ctx);
}
