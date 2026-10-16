import { newsletterRules } from "@overpass/shared";
import type { IssueItem } from "@overpass/shared";
import type { ClaimedDelivery, IssueRow } from "../model.js";
import type { NewsletterDeps } from "./context.js";
import { issueMail } from "./mail.js";
import { unsubscribeToken } from "./tokens.js";

const minute = 60_000;
const staleAfterMs = 10 * minute;
const firstRetryMs = 5 * minute;
const maxAttempts = 5;

type Rendered = { issue: IssueRow; items: IssueItem[] } | null;

export type SendingOptions = { batchSize?: number };

/** One issue is resolved once per batch, at sending time, so hidden content never goes out. */
function issueCache(deps: NewsletterDeps) {
  const cache = new Map<string, Promise<Rendered>>();
  return (id: string): Promise<Rendered> => {
    const cached = cache.get(id);
    if (cached !== undefined) return cached;
    const loading = (async () => {
      const issue = await deps.repository.findIssue(id);
      if (issue === null) return null;
      return { issue, items: await deps.repository.resolveItems(issue.items, deps.now()) };
    })();
    cache.set(id, loading);
    return loading;
  };
}

function mailFor(
  deps: NewsletterDeps,
  to: string,
  subscriberId: string,
  rendered: NonNullable<Rendered>,
) {
  const { issue, items } = rendered;
  const token = unsubscribeToken(deps.secret, subscriberId);
  return issueMail({
    to,
    language: issue.language,
    subject: issue.subject,
    intro: issue.intro,
    items,
    webOrigin: deps.webOrigin,
    unsubscribePage: `${deps.webOrigin}/${issue.language}/newsletter/unsubscribe#token=${token}`,
    oneClickUrl: `${deps.webOrigin}/v1/newsletter/unsubscribe?token=${token}`,
  });
}

/** A reader who left after the queueing is skipped: unsubscribing takes effect at once. */
async function deliver(
  deps: NewsletterDeps,
  delivery: ClaimedDelivery,
  issueOf: ReturnType<typeof issueCache>,
) {
  const { repository } = deps;
  const subscriber = await repository.subscriberById(delivery.subscriberId);
  const rendered = await issueOf(delivery.issueId);
  const active = subscriber?.confirmedAt != null && subscriber.unsubscribedAt === null;
  if (subscriber === null || !active || rendered === null) {
    await repository.markSkipped(delivery.id);
    return;
  }
  try {
    await deps.mailer.send(mailFor(deps, subscriber.email, subscriber.id, rendered));
    await repository.markSent(delivery.id, deps.now());
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    deps.log.error({ err: error, delivery: delivery.id }, "newsletter mail could not be sent");
    if (delivery.attempts >= maxAttempts) {
      await repository.markFailed(delivery.id, reason);
      return;
    }
    const wait = firstRetryMs * 2 ** (delivery.attempts - 1);
    await repository.markRetry(delivery.id, new Date(deps.now().getTime() + wait), reason);
  }
}

/** Sends one batch and returns how many deliveries it handled. */
export function sendingService(deps: NewsletterDeps, options: SendingOptions = {}) {
  const batchSize = options.batchSize ?? newsletterRules.batchSize;
  return {
    runOnce: async (): Promise<number> => {
      const now = deps.now();
      const staleBefore = new Date(now.getTime() - staleAfterMs);
      const claimed = await deps.repository.claim(batchSize, now, staleBefore);
      const issueOf = issueCache(deps);
      for (const delivery of claimed) await deliver(deps, delivery, issueOf);
      await deps.repository.finishIssues(deps.now());
      return claimed.length;
    },
    purge: (): Promise<void> => Promise.resolve(),
  };
}
