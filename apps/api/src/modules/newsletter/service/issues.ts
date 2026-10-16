import { newsletterRules } from "@overpass/shared";
import type { Issue, IssueCreateInput, IssueUpdateInput, Language } from "@overpass/shared";
import { AppError } from "../../../http/app-error.js";
import type { Account } from "../../accounts/index.js";
import type { IssueRow } from "../model.js";
import { requireAdmin } from "./context.js";
import type { NewsletterDeps } from "./context.js";
import { fill, texts } from "./mail.js";

const day = 86_400_000;
const issuesShown = 50;

/** Items hidden since the review disappear here too, as they will from the mail. */
async function toIssue(deps: NewsletterDeps, row: IssueRow): Promise<Issue> {
  return {
    id: row.id,
    number: row.number,
    language: row.language,
    subject: row.subject,
    intro: row.intro,
    items: await deps.repository.resolveItems(row.items, deps.now()),
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    queuedAt: row.queuedAt?.toISOString() ?? null,
    sentAt: row.sentAt?.toISOString() ?? null,
    recipients: row.recipients,
    delivered: row.delivered,
  };
}

async function existing(deps: NewsletterDeps, id: string): Promise<IssueRow> {
  const row = await deps.repository.findIssue(id);
  if (row === null) throw new AppError("not_found", 404);
  return row;
}

async function draft(deps: NewsletterDeps, language: Language) {
  const now = deps.now();
  const since = new Date(now.getTime() - newsletterRules.weekDays * day);
  const date = new Intl.DateTimeFormat(language, { dateStyle: "long", timeZone: "UTC" });
  const copy = texts[language].draft;
  return {
    language,
    subject: fill(copy.subject, { date: date.format(since) }),
    intro: copy.intro,
    items: await deps.repository.highlights(language, since, now, newsletterRules.itemsPerKind),
  };
}

async function create(deps: NewsletterDeps, account: Account, input: IssueCreateInput) {
  const id = await deps.repository.insertIssue({ ...input, createdBy: account.id, at: deps.now() });
  return toIssue(deps, await existing(deps, id));
}

async function update(deps: NewsletterDeps, id: string, input: IssueUpdateInput) {
  if ((await existing(deps, id)).status !== "draft") throw new AppError("issue_not_draft", 409);
  await deps.repository.updateIssue(id, input);
  return toIssue(deps, await existing(deps, id));
}

async function send(deps: NewsletterDeps, id: string) {
  const row = await existing(deps, id);
  if (row.status !== "draft") throw new AppError("issue_not_draft", 409);
  const items = await deps.repository.resolveItems(row.items, deps.now());
  if (items.length === 0) throw new AppError("issue_empty", 409);
  if ((await deps.repository.queueIssue(id, deps.now())) === null) {
    throw new AppError("issue_not_draft", 409);
  }
  return toIssue(deps, await existing(deps, id));
}

/** Every issue action belongs to the team. */
export function issueService(deps: NewsletterDeps) {
  const admin = <T>(account: Account, action: () => Promise<T>): Promise<T> => {
    requireAdmin(account);
    return action();
  };
  return {
    draft: (account: Account, language: Language) => admin(account, () => draft(deps, language)),
    issues: (account: Account) =>
      admin(account, async () => {
        const rows = await deps.repository.listIssues(issuesShown);
        return Promise.all(rows.map((row) => toIssue(deps, row)));
      }),
    issue: (account: Account, id: string) =>
      admin(account, async () => toIssue(deps, await existing(deps, id))),
    createIssue: (account: Account, input: IssueCreateInput) =>
      admin(account, () => create(deps, account, input)),
    updateIssue: (account: Account, id: string, input: IssueUpdateInput) =>
      admin(account, () => update(deps, id, input)),
    sendIssue: (account: Account, id: string) => admin(account, () => send(deps, id)),
  };
}
