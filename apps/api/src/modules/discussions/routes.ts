import { ok, pickLanguage } from "@overpass/shared";
import type { FastifyInstance } from "fastify";
import { parseInput } from "../../http/validate.js";
import { requireAccount } from "../accounts/index.js";
import type { AccountResolver } from "../accounts/index.js";
import {
  acceptInput,
  idParams,
  moderationDecisionInput,
  moderationParams,
  replyCreateInput,
  threadCreateInput,
  threadListQuery,
} from "./schemas.js";
import type { DiscussionsService } from "./service.js";

const minute = 60 * 1000;
const hour = 60 * minute;

/** Per-IP budgets: reads are cheap, writing a thread is rare, votes and reports are clicks. */
const limits = {
  read: { max: 240, timeWindow: minute },
  thread: { max: 10, timeWindow: hour },
  reply: { max: 60, timeWindow: hour },
  click: { max: 120, timeWindow: hour },
};

type Context = { app: FastifyInstance; service: DiscussionsService; resolve: AccountResolver };

function readRoutes({ app, service, resolve }: Context): void {
  const options = { config: { rateLimit: limits.read } };
  app.get("/v1/topics", options, async (request) =>
    ok(await service.topics(pickLanguage(request.headers["accept-language"]))),
  );
  app.get("/v1/threads", options, async (request) =>
    ok(await service.list(parseInput(threadListQuery, request.query))),
  );
  app.get("/v1/threads/:id", options, async (request) => {
    const { id } = parseInput(idParams, request.params);
    return ok(await service.read(id, await resolve(request)));
  });
}

function writeRoutes({ app, service, resolve }: Context): void {
  app.post("/v1/threads", { config: { rateLimit: limits.thread } }, async (request, reply) => {
    const account = await requireAccount(resolve, request);
    const input = parseInput(threadCreateInput, request.body);
    return reply.code(201).send(ok(await service.create(account, input)));
  });
  const replyOptions = { config: { rateLimit: limits.reply } };
  app.post("/v1/threads/:id/replies", replyOptions, async (request, reply) => {
    const account = await requireAccount(resolve, request);
    const { id } = parseInput(idParams, request.params);
    const input = parseInput(replyCreateInput, request.body);
    return reply.code(201).send(ok(await service.reply(account, id, input)));
  });
}

function clickRoutes({ app, service, resolve }: Context): void {
  const options = { config: { rateLimit: limits.click } };
  app.post("/v1/replies/:id/useful", options, async (request) => {
    const account = await requireAccount(resolve, request);
    return ok(await service.vote(account, parseInput(idParams, request.params).id));
  });
  app.post("/v1/threads/:id/accept", options, async (request) => {
    const account = await requireAccount(resolve, request);
    const { id } = parseInput(idParams, request.params);
    return ok(await service.accept(account, id, parseInput(acceptInput, request.body)));
  });
  for (const kind of ["thread", "reply"] as const) {
    const path = kind === "thread" ? "/v1/threads/:id/reports" : "/v1/replies/:id/reports";
    app.post(path, options, async (request, reply) => {
      const account = await requireAccount(resolve, request);
      const { id } = parseInput(idParams, request.params);
      return reply.code(201).send(ok(await service.report(account, kind, id)));
    });
  }
}

function moderationRoutes({ app, service, resolve }: Context): void {
  app.get("/v1/moderation/reports", async (request) =>
    ok(await service.queue(await requireAccount(resolve, request))),
  );
  app.post("/v1/moderation/:kind/:id", async (request) => {
    const account = await requireAccount(resolve, request);
    const { kind, id } = parseInput(moderationParams, request.params);
    const { decision } = parseInput(moderationDecisionInput, request.body);
    return ok(await service.decide(account, kind, id, decision));
  });
}

/** HTTP surface of the module; handlers only parse, delegate and shape the envelope. */
export function registerDiscussionsRoutes(
  app: FastifyInstance,
  service: DiscussionsService,
  resolve: AccountResolver,
): void {
  app.addHook("onSend", async (_request, reply) => {
    reply.header("cache-control", "no-store");
  });
  const context = { app, service, resolve };
  readRoutes(context);
  writeRoutes(context);
  clickRoutes(context);
  moderationRoutes(context);
}
