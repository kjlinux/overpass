import { AppError } from "../../../http/app-error.js";
import type { CounterStore } from "../../../limits/index.js";
import type { Mailer } from "../../../mail/mailer.js";
import type { Account } from "../../accounts/index.js";
import type { NewsletterRepository } from "../model.js";

export type NewsletterLog = { error(details: object, message: string): void };

export type NewsletterDeps = {
  repository: NewsletterRepository;
  mailer: Mailer;
  counters: CounterStore;
  secret: string;
  webOrigin: string;
  now: () => Date;
  log: NewsletterLog;
};

export function requireAdmin(account: Account): void {
  if (account.role !== "admin") throw new AppError("admin_only", 403);
}
