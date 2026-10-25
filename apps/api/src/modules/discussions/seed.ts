import type { Language, TopicSlug } from "@overpass/shared";
import { and, eq } from "drizzle-orm";
import type { Database } from "../../db/client.js";
import { adminIdByHandle } from "../accounts/index.js";
import type { DiscussionsRepository } from "./model.js";
import { createDiscussionsRepository } from "./repository.js";
import { threads } from "./tables.js";

export type ReplySeed = {
  author: string;
  at: Date;
  useful: readonly string[];
  accepted: boolean;
  content: string;
};

/** Without an author the thread is the team's; replies come in the order they were written. */
export type ThreadSeed = {
  topic: TopicSlug;
  language: Language;
  title: string;
  content: string;
  author?: string | undefined;
  at?: Date | undefined;
  country?: string | undefined;
  stack?: string | undefined;
  replies?: readonly ReplySeed[] | undefined;
};

type Authors = ReadonlyMap<string, string>;

function idOf(authors: Authors, handle: string): string {
  const id = authors.get(handle);
  if (id === undefined) throw new Error(`unknown author in the seed: ${handle}`);
  return id;
}

async function exists(db: Database, authorId: string, seed: ThreadSeed): Promise<boolean> {
  const found = await db
    .select({ id: threads.id })
    .from(threads)
    .where(
      and(
        eq(threads.authorId, authorId),
        eq(threads.topic, seed.topic),
        eq(threads.language, seed.language),
        eq(threads.title, seed.title),
      ),
    )
    .limit(1);
  return found.length > 0;
}

async function addReplies(
  repository: DiscussionsRepository,
  threadId: string,
  replies: readonly ReplySeed[],
  authors: Authors,
): Promise<void> {
  for (const reply of replies) {
    const authorId = idOf(authors, reply.author);
    const created = await repository.insertReply({
      threadId,
      authorId,
      content: reply.content,
      at: reply.at,
    });
    for (const voter of reply.useful) {
      await repository.insertVote(created.id, idOf(authors, voter), reply.at);
    }
    if (reply.accepted) await repository.setAccepted(threadId, created.id);
  }
}

/** Opens each thread once with its replies; a thread already there is left as it is. */
export async function seedThreads(
  db: Database,
  handle: string,
  seeds: readonly ThreadSeed[],
  at: Date,
  authors: Authors = new Map(),
): Promise<{ created: number }> {
  const teamId = await adminIdByHandle(db, handle);
  const repository = createDiscussionsRepository(db);
  let created = 0;
  for (const seed of seeds) {
    const authorId = seed.author === undefined ? teamId : idOf(authors, seed.author);
    if (await exists(db, authorId, seed)) continue;
    const when = seed.at ?? at;
    const { topic, language, title, content } = seed;
    const thread = await repository.insertThread({
      ...{ topic, language, title, content, authorId },
      errorText: null,
      codeText: null,
      country: seed.country ?? null,
      stack: seed.stack ?? null,
      routeId: null,
      serviceId: null,
      createdAt: when,
      lastActivityAt: when,
    });
    await addReplies(repository, thread.id, seed.replies ?? [], authors);
    created += 1;
  }
  return { created };
}
