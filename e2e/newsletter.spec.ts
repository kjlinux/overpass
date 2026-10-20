import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { locale, path } from "./i18n.js";
import { promoteAdmin, resetRateLimits } from "./admin.js";
import { stampOf } from "./itineraries.js";
import { newMember } from "./members.js";
import { linkMailedTo, mailMentioning } from "./outbox.js";
import { startWorker } from "./processes.js";
import type { Running } from "./processes.js";

let worker: Running;
test.beforeEach(async () => {
  await resetRateLimits();
  worker = startWorker();
});
test.afterEach(() => {
  worker.stop();
});

async function subscribe(page: Page, email: string): Promise<void> {
  const layout = locale("layout");
  await page.goto(path("/newsletter"));
  const main = page.getByRole("main");
  await main.getByLabel(layout.newsletter.email, { exact: true }).fill(email);
  await main.getByRole("button", { name: layout.newsletter.subscribe }).click();
  await expect(main.getByText(layout.newsletter.sent)).toBeVisible();
}

async function confirm(page: Page, email: string): Promise<void> {
  const done = locale("newsletter").confirm.doneTitle;
  await page.goto(await linkMailedTo(email));
  await expect(page.getByRole("heading", { name: done })).toBeVisible();
}

/** The team writes one post so the week has content, then reviews and sends the issue. */
async function sendIssue(admin: Page, subject: string): Promise<void> {
  const [blog, newsletter] = [locale("blog"), locale("newsletter")];
  await admin.goto(path("/blog/write"));
  const main = admin.getByRole("main");
  await main
    .getByLabel(blog.editor.title, { exact: true })
    .fill(`Article de la semaine ${subject}`);
  await main.getByLabel(blog.editor.summary, { exact: true }).fill("Un résumé.");
  await main.getByLabel(blog.editor.content, { exact: true }).fill("Le texte de la semaine.");
  await main.getByRole("button", { name: blog.editor.publish, exact: true }).click();
  await admin.goto(path("/admin/newsletter"));
  await admin.getByRole("button", { name: newsletter.admin.prepare }).click();
  await admin.getByLabel(newsletter.admin.subject, { exact: true }).fill(subject);
  await admin.getByRole("button", { name: newsletter.admin.send, exact: true }).click();
  await admin.getByRole("dialog").getByRole("button", { name: newsletter.admin.send }).click();
}

/** The worker paces batches, so the issue may take a few polls to land. */
async function issueMailedTo(email: string): Promise<{ subject: string; text: string }> {
  let mail: { subject: string; text: string } | undefined;
  await expect
    .poll(
      async () => {
        mail = await mailMentioning(email, "/newsletter/unsubscribe#token=").catch(() => undefined);
        return mail !== undefined;
      },
      { timeout: 30_000 },
    )
    .toBe(true);
  if (mail === undefined) throw new Error(`no issue mailed to ${email}`);
  return mail;
}

test("subscribe, confirm, receive an issue in the test mailbox, then unsubscribe in one click", async ({
  browser,
  page,
}) => {
  test.setTimeout(120_000);
  const stamp = stampOf(test.info().project.name);
  const email = `e2e-reader-${stamp}@example.com`;
  await subscribe(page, email);
  await confirm(page, email);

  const admin = await newMember(browser, `letter-admin-${stamp}`);
  await promoteAdmin(`letter-admin-${stamp}`);
  const subject = `Overpass ${stamp}`;
  await sendIssue(admin, subject);

  const issue = await issueMailedTo(email);
  expect(issue.subject).toBe(subject);
  const link = /https?:\/\/\S+\/newsletter\/unsubscribe#token=\S+/.exec(issue.text)?.[0] ?? "";
  await page.goto(link);
  const left = locale("newsletter").unsubscribe.doneTitle;
  await expect(page.getByRole("heading", { name: left })).toBeVisible();
});
