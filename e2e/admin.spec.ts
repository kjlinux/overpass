import { expect, test } from "@playwright/test";
import type { Browser, Page } from "@playwright/test";
import accounts from "../apps/web/src/pages/accounts/locales/fr.json" with { type: "json" };
import admin from "../apps/web/src/pages/admin/locales/fr.json" with { type: "json" };
import routes from "../apps/web/src/pages/routes/locales/fr.json" with { type: "json" };
import api from "../packages/shared/src/i18n/locales/fr.json" with { type: "json" };
import { promoteAdmin, resetRateLimits } from "./admin.js";
import { newMember, password } from "./members.js";

test.beforeEach(() => resetRateLimits());

const stampOf = () => `${String(Date.now())}-${test.info().project.name}`;

async function publishRoute(page: Page, title: string): Promise<string> {
  await page.goto("/fr/routes/new");
  const main = page.getByRole("main");
  await main.getByLabel(routes.editor.title, { exact: true }).fill(title);
  await main.getByLabel(routes.editor.service, { exact: true }).selectOption("wave");
  await main.getByLabel(routes.editor.country, { exact: true }).selectOption("CI");
  await main.getByLabel(routes.editor.stack, { exact: true }).selectOption("laravel");
  await page.getByRole("button", { name: routes.editor.submitCreate }).click();
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  return page.url();
}

async function flagRoute(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await page.getByRole("button", { name: routes.flag.action }).click();
  const dialog = page.getByRole("dialog", { name: routes.flag.title });
  await dialog
    .getByLabel(routes.flag.reason)
    .fill("Le lien de paiement mène vers un site douteux.");
  await dialog.getByRole("button", { name: routes.flag.submit }).click();
  await expect(page.getByRole("status").filter({ hasText: routes.flag.sent })).toBeVisible();
  await page.getByRole("button", { name: routes.flag.action }).waitFor({ state: "detached" });
}

async function signInAs(browser: Browser, email: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/fr/sign-in");
  await page.getByRole("main").getByLabel(accounts.fields.email).fill(email);
  await page.getByRole("main").getByLabel(accounts.fields.password).fill(password);
  await page.getByRole("button", { name: accounts.signIn.submit, exact: true }).click();
  return page;
}

async function suspendMember(team: Page, handle: string, reason: string): Promise<void> {
  await team.getByRole("tab", { name: admin.tabs.accounts }).click();
  await team.getByLabel(admin.accounts.search).fill(handle);
  await team.getByRole("button", { name: admin.accounts.submit }).click();
  await team.getByRole("button", { name: new RegExp(`^${admin.accounts.suspend} `) }).click();
  const suspend = team.getByRole("dialog");
  await suspend.getByLabel(admin.accounts.reason).fill(reason);
  await suspend.getByRole("button", { name: admin.accounts.suspend }).click();
  await expect(team.getByRole("status").filter({ hasText: "suspendu" })).toBeVisible();
}

test("a member reports an itinerary, the team hides it, suspends the member and logs both", async ({
  browser,
}) => {
  test.setTimeout(150_000);
  const stamp = stampOf();
  const title = `Wave signalé ${stamp}`;
  const author = await newMember(browser, `flag-author-${stamp}`);
  const url = await publishRoute(author, title);
  const reader = await newMember(browser, `flag-reader-${stamp}`);
  await flagRoute(reader, url);

  const team = await newMember(browser, `flag-admin-${stamp}`);
  await promoteAdmin(`flag-admin-${stamp}`);
  await team.goto("/fr/moderation");
  await expect(team).toHaveURL(/\/fr\/admin$/);
  const row = team.getByRole("listitem").filter({ hasText: title });
  await expect(row.getByText("1 signalement")).toBeVisible();
  await row.getByRole("button", { name: admin.decision.hide, exact: true }).click();
  const hide = team.getByRole("dialog");
  await hide.getByLabel(admin.queue.reason).fill(`Lien douteux confirmé ${stamp}`);
  await hide.getByRole("button", { name: admin.decision.hide }).click();
  await expect(row).toHaveCount(0);
  await team.getByLabel(admin.stateFilter.label).selectOption("hidden");
  await expect(row.getByText(admin.status.hidden, { exact: true })).toBeVisible();

  await author.goto(url);
  await expect(author.getByText(routes.hidden.title)).toBeVisible();

  await suspendMember(team, `e2e-flag-reader-${stamp}`, `Signalements abusifs ${stamp}`);

  const refused = await signInAs(browser, `e2e-flag-reader-${stamp}@example.com`);
  await expect(refused.getByRole("alert")).toHaveText(api.errors.account_suspended);

  await team.getByRole("tab", { name: admin.tabs.log }).focus();
  await team.keyboard.press("ArrowRight");
  await team.keyboard.press("ArrowLeft");
  const log = team.getByRole("tabpanel", { name: admin.tabs.log });
  // The throwaway database keeps earlier runs: find this run's rows by their reasons.
  const suspended = log.getByRole("row").filter({ hasText: `Signalements abusifs ${stamp}` });
  await expect(suspended.getByText(admin.log.actions.suspend)).toBeVisible();
  await expect(
    log.getByRole("row").filter({ hasText: `Lien douteux confirmé ${stamp}` }),
  ).toBeVisible();
});

test("a member is refused the administration page in writing", async ({ browser }) => {
  const member = await newMember(browser, `not-admin-${stampOf()}`);
  await member.goto("/fr/admin");
  await expect(member.getByText(admin.refused)).toBeVisible();
  await expect(member.getByRole("tablist")).toHaveCount(0);
});
