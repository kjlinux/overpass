import { readContent } from "./content/read.js";
import type { Database } from "./db/client.js";
import { adminIdByHandle } from "./modules/accounts/index.js";
import { seedPosts } from "./modules/blog/index.js";
import { seedThreads } from "./modules/discussions/index.js";
import { rankingModule } from "./modules/ranking/index.js";
import { seedRoutes } from "./modules/routes/index.js";

export type SeededContent = { routes: number; threads: number; posts: number };

const stderr = { error: (...args: unknown[]) => process.stderr.write(`${JSON.stringify(args)}\n`) };

/** Reads the whole tree first, so an invalid file stops the run before any write. */
export async function seedContent(
  db: Database,
  handle: string,
  directory: string,
  now: () => Date,
): Promise<SeededContent> {
  const content = readContent(directory);
  const at = now();
  const routes = await seedRoutes(db, handle, content.routes, at);
  const threads = await seedThreads(db, handle, content.threads, at);
  const posts = await seedPosts(db, handle, content.posts, at);
  await rankingModule(db, now, stderr).listener([await adminIdByHandle(db, handle)]);
  return { routes: routes.created, threads: threads.created, posts: posts.created };
}
