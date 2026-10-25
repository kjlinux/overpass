import type { FastifyInstance } from "fastify";
import type { Database } from "../../db/client.js";
import type { RequestTrust } from "../../limits/index.js";
import type { AccountResolver } from "../accounts/index.js";
import type { ModerationLog } from "../admin/index.js";
import { mediaOwnership } from "../media/index.js";
import type { ContributionListener, TrustSource } from "../ranking/index.js";
import { createBlogRepository } from "./repository.js";
import { registerBlogRoutes } from "./routes.js";
import { createBlogService } from "./service.js";

export type BlogOptions = {
  db: Database;
  resolveAccount: AccountResolver;
  onContribution: ContributionListener;
  trust: TrustSource;
  confirmed: RequestTrust;
  log: ModerationLog;
  webOrigin: string;
  now: () => Date;
};

/** Mounts the blog module in its own encapsulated scope. */
export async function registerBlog(app: FastifyInstance, options: BlogOptions): Promise<void> {
  const service = createBlogService({
    repository: createBlogRepository(options.db),
    onContribution: options.onContribution,
    trust: options.trust,
    log: options.log,
    webOrigin: options.webOrigin,
    ownsMedia: mediaOwnership(options.db),
    now: options.now,
  });
  await app.register((scope) => {
    registerBlogRoutes(scope, service, options.resolveAccount, options.confirmed);
    return Promise.resolve();
  });
}

/** The visibility rule of posts, for modules that pick posts for other channels. */
export { listed as listedPostCondition } from "./repository/sql.js";
export { seedNewsTemplates } from "./templates.js";
export { seedPosts } from "./seed.js";
export type { PostSeed } from "./seed.js";
