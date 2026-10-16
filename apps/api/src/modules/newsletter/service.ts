import type { NewsletterDeps } from "./service/context.js";
import { issueService } from "./service/issues.js";
import { subscriptionService } from "./service/subscriptions.js";

export type { NewsletterDeps, NewsletterLog } from "./service/context.js";

/** Business rules of the newsletter module, independent of HTTP and SQL. */
export function createNewsletterService(deps: NewsletterDeps) {
  return { ...subscriptionService(deps), ...issueService(deps) };
}

export type NewsletterService = ReturnType<typeof createNewsletterService>;
