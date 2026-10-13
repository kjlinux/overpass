import { expect } from "@playwright/test";
import type { Browser, Page } from "@playwright/test";
import accounts from "../apps/web/src/pages/accounts/locales/fr.json" with { type: "json" };
import dashboard from "../apps/web/src/pages/dashboard/locales/fr.json" with { type: "json" };
import { linkMailedTo } from "./outbox.js";

export const password = "une phrase de passe assez longue";

/** Signs a new member up through the confirmation e-mail, in a browser context of their own. */
export async function newMember(browser: Browser, name: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  const email = `e2e-${name}@example.com`;
  await page.goto("/fr/sign-up");
  await page.getByRole("main").getByLabel(accounts.fields.email).fill(email);
  await page.getByRole("main").getByLabel(accounts.fields.password, { exact: true }).fill(password);
  await page.getByRole("main").getByLabel(accounts.fields.country).selectOption("CI");
  await page.getByRole("button", { name: accounts.signUp.submit }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: accounts.signUp.sentTitle }),
  ).toBeVisible();
  await page.goto(await linkMailedTo(email));
  await page.getByRole("button", { name: accounts.stacks.submit }).click();
  await expect(page.getByRole("heading", { level: 1, name: dashboard.title })).toBeVisible();
  return page;
}
