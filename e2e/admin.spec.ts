import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { format, locale, path, tail, urlEndingWith } from "./i18n.js";
import { promoteAdmin, resetRateLimits } from "./admin.js";
import { publishRoute, stampOf } from "./itineraries.js";
import { emailOf, newMember, signInAs } from "./members.js";

test.beforeEach(() => resetRateLimits());

async function flagRoute(page: Page, url: string): Promise<void> {
  const routes = locale("routes");
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

async function suspendMember(team: Page, handle: string, reason: string): Promise<void> {
  const admin = locale("admin");
  await team.getByRole("tab", { name: admin.tabs.accounts }).click();
  await team.getByLabel(admin.accounts.search).fill(handle);
  await team.getByRole("button", { name: admin.accounts.submit }).click();
  await team.getByRole("button", { name: new RegExp(`^${admin.accounts.suspend} `) }).click();
  const suspend = team.getByRole("dialog");
  await suspend.getByLabel(admin.accounts.reason).fill(reason);
  await suspend.getByRole("button", { name: admin.accounts.suspend }).click();
  await expect(
    team.getByRole("status").filter({ hasText: tail(admin.accounts.suspended) }),
  ).toBeVisible();
}

async function hideReported(team: Page, title: string, stamp: string): Promise<void> {
  const admin = locale("admin");
  await team.goto(path("/moderation"));
  await expect(team).toHaveURL(urlEndingWith("/admin"));
  const row = team.getByRole("listitem").filter({ hasText: title });
  await expect(row.getByText(format(admin.queue.count_one, { count: 1 }))).toBeVisible();
  await row.getByRole("button", { name: admin.decision.hide, exact: true }).click();
  const hide = team.getByRole("dialog");
  await hide.getByLabel(admin.queue.reason).fill(`Lien douteux confirmé ${stamp}`);
  await hide.getByRole("button", { name: admin.decision.hide }).click();
  await expect(row).toHaveCount(0);
  await team.getByLabel(admin.stateFilter.label).selectOption("hidden");
  await expect(row.getByText(admin.status.hidden, { exact: true })).toBeVisible();
}

test("a member reports an itinerary, the team hides it, suspends the member and logs both", async ({
  browser,
}) => {
  test.setTimeout(150_000);
  const [admin, api, routes] = [locale("admin"), locale("api"), locale("routes")];
  const stamp = stampOf(test.info().project.name);
  const title = `Wave signalé ${stamp}`;
  const author = await newMember(browser, `flag-author-${stamp}`);
  const url = await publishRoute(author, title);
  const reader = await newMember(browser, `flag-reader-${stamp}`);
  await flagRoute(reader, url);

  const team = await newMember(browser, `flag-admin-${stamp}`);
  await promoteAdmin(`flag-admin-${stamp}`);
  await hideReported(team, title, stamp);
  await author.goto(url);
  await expect(author.getByText(routes.hidden.title)).toBeVisible();

  await suspendMember(team, `e2e-flag-reader-${stamp}`, `Signalements abusifs ${stamp}`);
  const refused = await signInAs(browser, emailOf(`flag-reader-${stamp}`));
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
  const admin = locale("admin");
  const member = await newMember(browser, `not-admin-${stampOf(test.info().project.name)}`);
  await member.goto(path("/admin"));
  await expect(member.getByText(admin.refused)).toBeVisible();
  await expect(member.getByRole("tablist")).toHaveCount(0);
});
