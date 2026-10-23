import type { Language, TopicSlug } from "@overpass/shared";
import { and, eq } from "drizzle-orm";
import type { Database } from "../../db/client.js";
import { adminIdByHandle } from "../accounts/index.js";
import { createDiscussionsRepository } from "./repository.js";
import { threads } from "./tables.js";

export type ThreadSeed = { topic: TopicSlug; language: Language; title: string; content: string };

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

/** Opens the team's welcome threads once; they carry no country, stack or linked route. */
export async function seedThreads(
  db: Database,
  handle: string,
  seeds: readonly ThreadSeed[],
  at: Date,
): Promise<{ created: number }> {
  const authorId = await adminIdByHandle(db, handle);
  const repository = createDiscussionsRepository(db);
  let created = 0;
  for (const seed of seeds) {
    if (await exists(db, authorId, seed)) continue;
    await repository.insertThread({
      ...seed,
      authorId,
      errorText: null,
      codeText: null,
      country: null,
      stack: null,
      routeId: null,
      serviceId: null,
      createdAt: at,
      lastActivityAt: at,
    });
    created += 1;
  }
  return { created };
}
