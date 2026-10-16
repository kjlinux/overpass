import { newsletterRules } from "@overpass/shared";
import type { Language, SubscribeInput } from "@overpass/shared";
import { AppError } from "../../../http/app-error.js";
import type { SubscriberRow } from "../model.js";
import type { NewsletterDeps } from "./context.js";
import { confirmationMail } from "./mail.js";
import { hashToken, newToken, subscriberOfToken } from "./tokens.js";

const hour = 3_600_000;
const day = 24 * hour;
const resendAfterMs = 10 * 60_000;
const pending = { status: "pending" } as const;

/** No mail to an active reader, and at most one link every ten minutes to a pending one. */
function shouldMail(subscriber: SubscriberRow, now: Date): boolean {
  const active = subscriber.confirmedAt !== null && subscriber.unsubscribedAt === null;
  if (active) return false;
  const waiting = subscriber.confirmTokenHash !== null && subscriber.unsubscribedAt === null;
  return !waiting || now.getTime() - subscriber.updatedAt.getTime() >= resendAfterMs;
}

async function mailLink(deps: NewsletterDeps, email: string, language: Language, token: string) {
  const link = `${deps.webOrigin}/${language}/newsletter/confirm#token=${token}`;
  try {
    await deps.mailer.send(confirmationMail(email, language, link));
  } catch (error) {
    deps.log.error({ err: error }, "newsletter confirmation mail could not be sent");
  }
}

/** The answer and its timing never say whether the address was already known. */
async function subscribe(deps: NewsletterDeps, input: SubscribeInput) {
  const now = deps.now();
  const existing = await deps.repository.subscriberByEmail(input.email);
  if (existing !== null && !shouldMail(existing, now)) return pending;
  // A per-address daily cap stops a stranger from flooding an inbox or voiding its link.
  const sent = await deps.counters.hit(`newsletter-confirm:${input.email}`, day);
  if (sent.count > newsletterRules.confirmationsPerDay) return pending;
  const token = newToken();
  const expiresAt = new Date(now.getTime() + newsletterRules.confirmHours * hour);
  const link = { language: input.language, tokenHash: hashToken(token), expiresAt, at: now };
  if (existing !== null) await deps.repository.refreshSubscriber(existing.id, link);
  else if (!(await deps.repository.insertSubscriber(input.email, link))) return pending;
  void mailLink(deps, input.email, input.language, token);
  return pending;
}

async function confirm(deps: NewsletterDeps, token: string) {
  const language = await deps.repository.confirm(hashToken(token), deps.now());
  if (language === null) throw new AppError("newsletter_link_invalid", 400);
  return { language };
}

async function unsubscribe(deps: NewsletterDeps, token: string) {
  const id = subscriberOfToken(deps.secret, token);
  if (id === null) throw new AppError("newsletter_link_invalid", 400);
  await deps.repository.unsubscribe(id, deps.now());
  return { unsubscribed: true };
}

export function subscriptionService(deps: NewsletterDeps) {
  return {
    subscribe: (input: SubscribeInput) => subscribe(deps, input),
    confirm: (token: string) => confirm(deps, token),
    unsubscribe: (token: string) => unsubscribe(deps, token),
  };
}
