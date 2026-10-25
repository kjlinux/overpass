import { unknownHandles } from "./content/authors.js";
import { readContent } from "./content/read.js";
import type { Database } from "./db/client.js";
import { adminIdByHandle, seedMembers } from "./modules/accounts/index.js";
import { seedPosts } from "./modules/blog/index.js";
import { seedThreads } from "./modules/discussions/index.js";
import { rankingModule } from "./modules/ranking/index.js";
import { seedRoutes } from "./modules/routes/index.js";

export type SeededContent = { members: number; routes: number; threads: number; posts: number };

const stderr = { error: (...args: unknown[]) => process.stderr.write(`${JSON.stringify(args)}\n`) };

/** Reads and cross-checks the whole tree first, so an invalid file stops the run before any write. */
export async function seedContent(
  db: Database,
  handle: string,
  directory: string,
  now: () => Date,
): Promise<SeededContent> {
  const content = readContent(directory);
  const unknown = unknownHandles(content);
  if (unknown.length > 0) throw new Error(`no file under members/ for: ${unknown.join(", ")}`);
  const at = now();
  const members = await seedMembers(db, content.members);
  const routes = await seedRoutes(db, handle, content.routes, at);
  const threads = await seedThreads(db, handle, content.threads, at, members.ids);
  const posts = await seedPosts(db, handle, content.posts, at, members.ids);
  const everyone = [await adminIdByHandle(db, handle), ...members.ids.values()];
  await rankingModule(db, now, stderr).listener(everyone);
  return {
    members: members.created,
    routes: routes.created,
    threads: threads.created,
    posts: posts.created,
  };
}
