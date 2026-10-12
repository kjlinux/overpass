import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import accounts from "../apps/web/src/pages/accounts/locales/fr.json" with { type: "json" };
import dashboard from "../apps/web/src/pages/dashboard/locales/fr.json" with { type: "json" };
import settings from "../apps/web/src/pages/settings/locales/fr.json" with { type: "json" };
import layout from "../apps/web/src/layout/locales/fr.json" with { type: "json" };
import api from "../packages/shared/src/i18n/locales/fr.json" with { type: "json" };
import { linkMailedTo } from "./outbox.js";

const password = "une phrase de passe assez longue";

async function signIn(page: Page, email: string, secret = password): Promise<void> {
  await page.goto("/fr/sign-in");
  await page.getByRole("main").getByLabel(accounts.fields.email).fill(email);
  await page.getByRole("main").getByLabel(accounts.fields.password, { exact: true }).fill(secret);
  await page.getByRole("button", { name: accounts.signIn.submit, exact: true }).click();
}

async function signOut(page: Page): Promise<void> {
  const menu = page.getByRole("button", { name: layout.menu });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole("button", { name: layout.signOut }).click();
  await expect(page).toHaveURL(/\/fr$/);
}

test("a visitor signs up, signs in again and deletes the account", async ({ page }) => {
  const email = `e2e-${String(Date.now())}-${test.info().project.name}@example.com`;

  await page.goto("/fr/sign-up");
  await page.getByRole("main").getByLabel(accounts.fields.email).fill(email);
  await page.getByRole("main").getByLabel(accounts.fields.password, { exact: true }).fill(password);
  await page.getByRole("main").getByLabel(accounts.fields.country).selectOption("CI");
  await page.getByRole("button", { name: accounts.signUp.submit }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: accounts.signUp.sentTitle }),
  ).toBeVisible();

  await page.goto(await linkMailedTo(email));
  await expect(page).toHaveURL(/\/fr\/sign-up\/stacks$/);
  await expect(page.getByRole("main").getByLabel(accounts.stacks.newsletter)).not.toBeChecked();
  await page.getByRole("main").getByLabel("Laravel").check();
  await page.getByRole("button", { name: accounts.stacks.submit }).click();
  await expect(page.getByRole("heading", { level: 1, name: dashboard.title })).toBeVisible();

  await signOut(page);
  await signIn(page, email, "not the password at all");
  await expect(page.getByRole("alert")).toHaveText(api.errors.invalid_credentials);
  await signIn(page, email);
  await expect(page).toHaveURL(/\/fr\/dashboard$/);

  await page.goto("/fr/settings");
  await page.getByRole("tab", { name: settings.tabs.account }).click();
  await page.getByRole("main").getByLabel(settings.account.password).fill(password);
  await page.getByRole("button", { name: settings.account.submit }).click();
  const dialog = page.getByRole("dialog", { name: settings.account.confirmTitle });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: settings.account.confirm }).click();
  await expect(page).toHaveURL(/\/fr$/);

  await signIn(page, email);
  await expect(page.getByRole("alert")).toHaveText(api.errors.invalid_credentials);
});

test("sign-up shows each error under its field before sending anything", async ({ page }) => {
  await page.goto("/fr/sign-up");
  await page.getByRole("main").getByLabel(accounts.fields.email).fill("pas-une-adresse");
  await page.getByRole("main").getByLabel(accounts.fields.password, { exact: true }).focus();
  await expect(page.locator("#email-error")).toHaveText(api.fields.email_invalid);
  await page.getByRole("button", { name: accounts.signUp.submit }).click();
  await expect(page.locator("#password-error")).toHaveText(api.fields.required);
  await expect(page.getByRole("main").getByLabel(accounts.fields.email)).toBeFocused();
});

test("the sign-up page never scrolls sideways", async ({ page }) => {
  await page.goto("/fr/sign-up");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
