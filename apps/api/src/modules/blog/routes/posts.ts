import { ok, pickLanguage } from "@overpass/shared";
import { parseInput } from "../../../http/validate.js";
import { writeLimit } from "../../../limits/index.js";
import { requireAccount } from "../../accounts/index.js";
import {
  feedQuery,
  handleParams,
  idParams,
  postCreateInput,
  postListQuery,
  postUpdateInput,
  readQuery,
  slugParams,
} from "../schemas.js";
import { limits } from "./context.js";
import type { Context } from "./context.js";

const feedCache = "public, max-age=300";

export function readRoutes({ app, service, resolve }: Context): void {
  const options = { config: { rateLimit: limits.read } };
  app.get("/v1/posts", options, async (request) =>
    ok(await service.list(parseInput(postListQuery, request.query), await resolve(request))),
  );
  app.get("/v1/posts/feed.xml", options, async (request, reply) => {
    const { lang } = parseInput(feedQuery, request.query);
    const document = await service.rss(lang);
    reply.type("application/rss+xml; charset=utf-8").header("cache-control", feedCache);
    return reply.send(document);
  });
  app.get("/v1/posts/:slug", options, async (request) => {
    const { slug } = parseInput(slugParams, request.params);
    const asked = parseInput(readQuery, request.query).lang;
    const lang = asked ?? pickLanguage(request.headers["accept-language"]);
    return ok(await service.read(slug, lang, await resolve(request)));
  });
  app.get("/v1/blogs/:handle", options, async (request) => {
    const { handle } = parseInput(handleParams, request.params);
    return ok(await service.blog(handle, await resolve(request)));
  });
}

export function writeRoutes({ app, service, resolve, confirmed }: Context): void {
  const options = { config: { rateLimit: writeLimit(limits.publish, confirmed) } };
  app.post("/v1/posts", options, async (request, reply) => {
    const account = await requireAccount(resolve, request);
    const input = parseInput(postCreateInput, request.body);
    return reply.code(201).send(ok(await service.create(account, input)));
  });
  app.patch("/v1/posts/:id", options, async (request) => {
    const account = await requireAccount(resolve, request);
    const { id } = parseInput(idParams, request.params);
    return ok(await service.update(account, id, parseInput(postUpdateInput, request.body)));
  });
  app.get("/v1/me/posts", async (request) =>
    ok(await service.mine(await requireAccount(resolve, request))),
  );
  app.get("/v1/me/posts/:id", async (request) => {
    const account = await requireAccount(resolve, request);
    return ok(await service.mineOne(account, parseInput(idParams, request.params).id));
  });
}
