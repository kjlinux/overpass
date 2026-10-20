import { integrationsTopic } from "@overpass/shared";
import type {
  Language,
  ReplyListQuery,
  ThreadCreateInput,
  ThreadListQuery,
  ThreadPage,
} from "@overpass/shared";
import { decodeDateCursor, encodeDateCursor } from "../../../http/date-cursor.js";
import { AppError } from "../../../http/app-error.js";
import type { Account } from "../../accounts/index.js";
import type { NewThread } from "../model.js";
import { readableThread, summaries } from "./context.js";
import type { DiscussionsDeps, Reader } from "./context.js";
import { threadDetail } from "./detail.js";
import { maskOptional, maskWithin } from "./masking.js";
import { replyPage } from "./replies.js";

/** A question asked from a route lands in Integrations with its service and country. */
async function routeTags(deps: DiscussionsDeps, input: ThreadCreateInput) {
  if (input.route === undefined) {
    return { topic: input.topic, country: input.country ?? null, routeId: null, serviceId: null };
  }
  const facts = await deps.routes.facts(input.route);
  if (facts === null) throw new AppError("not_found", 404);
  return {
    topic: integrationsTopic,
    country: facts.country,
    routeId: facts.id,
    serviceId: facts.service.id,
  };
}

async function newThread(deps: DiscussionsDeps, account: Account, input: ThreadCreateInput) {
  const at = deps.now();
  const thread: NewThread = {
    ...(await routeTags(deps, input)),
    authorId: account.id,
    title: maskWithin("title", input.title),
    content: maskWithin("content", input.content),
    errorText: maskOptional("errorText", input.errorText),
    codeText: maskOptional("codeText", input.codeText),
    language: input.language,
    stack: input.stack ?? null,
    createdAt: at,
    lastActivityAt: at,
  };
  return deps.repository.insertThread(thread);
}

export function threadService(deps: DiscussionsDeps) {
  return {
    topics: async (language: Language) =>
      (await deps.repository.topics()).map((topic) => ({
        slug: topic.slug,
        name: topic.names[language],
        description: topic.descriptions[language],
        threads: topic.threads,
      })),

    list: async (query: ThreadListQuery): Promise<ThreadPage> => {
      const { cursor, ...filters } = query;
      const after = cursor === undefined ? undefined : decodeDateCursor(cursor);
      const rows = await deps.repository.listThreads({ ...filters, after });
      const page = rows.slice(0, query.limit);
      const last = page[page.length - 1];
      const more = rows.length > query.limit && last !== undefined;
      return {
        items: await summaries(deps, page),
        nextCursor: more ? encodeDateCursor({ at: last.lastActivityAt, id: last.id }) : null,
      };
    },

    read: async (id: string, reader: Reader) =>
      threadDetail(deps, await readableThread(deps, id, reader), reader),

    replies: async (id: string, query: ReplyListQuery, reader: Reader) =>
      replyPage(deps, await readableThread(deps, id, reader), reader, query),

    create: async (account: Account, input: ThreadCreateInput) => {
      const created = await newThread(deps, account, input);
      return threadDetail(deps, await readableThread(deps, created.id, account), account);
    },
  };
}
