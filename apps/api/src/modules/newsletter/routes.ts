import { ok } from "@overpass/shared";
import type { FastifyInstance } from "fastify";
import { parseInput } from "../../http/validate.js";
import { requireAccount } from "../accounts/index.js";
import type { AccountResolver } from "../accounts/index.js";
import {
  idParams,
  issueCreateInput,
  issueDraftQuery,
  issueUpdateInput,
  newsletterTokenInput,
  subscribeInput,
  tokenQuery,
} from "./schemas.js";
import type { NewsletterService } from "./service.js";

const hour = 3_600_000;

/** Per-IP budgets: a reader subscribes once, a link is clicked a few times. */
const limits = {
  subscribe: { max: 10, timeWindow: hour },
  link: { max: 30, timeWindow: hour },
};

type Context = { app: FastifyInstance; service: NewsletterService; resolve: AccountResolver };

function publicRoutes({ app, service }: Context): void {
  app.post(
    "/v1/newsletter/subscribe",
    { config: { rateLimit: limits.subscribe } },
    async (request, reply) =>
      reply.code(202).send(ok(await service.subscribe(parseInput(subscribeInput, request.body)))),
  );
  app.post("/v1/newsletter/confirm", { config: { rateLimit: limits.link } }, async (request) => {
    const { token } = parseInput(newsletterTokenInput, request.body);
    return ok(await service.confirm(token));
  });
}

/** RFC 8058 clients post a form body; its content is ignored and only the token counts. */
async function unsubscribeRoute({ app, service }: Context): Promise<void> {
  await app.register((scope) => {
    scope.addContentTypeParser(
      "application/x-www-form-urlencoded",
      { parseAs: "string", bodyLimit: 1024 },
      (_request, _body, done) => {
        done(null, {});
      },
    );
    scope.post(
      "/v1/newsletter/unsubscribe",
      { config: { rateLimit: limits.link } },
      async (request) => {
        const fromQuery = parseInput(tokenQuery, request.query).token;
        const body = (request.body ?? {}) as { token?: unknown };
        const { token } = parseInput(newsletterTokenInput, { token: fromQuery ?? body.token });
        return ok(await service.unsubscribe(token));
      },
    );
    return Promise.resolve();
  });
}

function issueRoutes({ app, service, resolve }: Context): void {
  app.get("/v1/newsletter/issues", async (request) =>
    ok(await service.issues(await requireAccount(resolve, request))),
  );
  app.get("/v1/newsletter/issues/draft", async (request) => {
    const account = await requireAccount(resolve, request);
    return ok(await service.draft(account, parseInput(issueDraftQuery, request.query).language));
  });
  app.get("/v1/newsletter/issues/:id", async (request) => {
    const account = await requireAccount(resolve, request);
    return ok(await service.issue(account, parseInput(idParams, request.params).id));
  });
  app.post("/v1/newsletter/issues", async (request, reply) => {
    const account = await requireAccount(resolve, request);
    const input = parseInput(issueCreateInput, request.body);
    return reply.code(201).send(ok(await service.createIssue(account, input)));
  });
  app.patch("/v1/newsletter/issues/:id", async (request) => {
    const account = await requireAccount(resolve, request);
    const { id } = parseInput(idParams, request.params);
    return ok(await service.updateIssue(account, id, parseInput(issueUpdateInput, request.body)));
  });
  app.post("/v1/newsletter/issues/:id/send", async (request) => {
    const account = await requireAccount(resolve, request);
    return ok(await service.sendIssue(account, parseInput(idParams, request.params).id));
  });
}

/** HTTP surface of the module; handlers only parse, delegate and shape the envelope. */
export async function registerNewsletterRoutes(
  app: FastifyInstance,
  service: NewsletterService,
  resolve: AccountResolver,
): Promise<void> {
  app.addHook("onSend", async (_request, reply) => {
    reply.header("cache-control", "no-store");
  });
  const context = { app, service, resolve };
  publicRoutes(context);
  await unsubscribeRoute(context);
  issueRoutes(context);
}
