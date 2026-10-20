import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { locale, path, urlEndingWith } from "./i18n.js";
import { expectNoSidewaysScroll } from "./layout.js";
import { password, signUp } from "./members.js";
import { linkMailedTo } from "./outbox.js";

async function signIn(page: Page, email: string, secret = password): Promise<void> {
  const accounts = locale("accounts");
  await page.goto(path("/sign-in"));
  await page.getByRole("main").getByLabel(accounts.fields.email).fill(email);
  await page.getByRole("main").getByLabel(accounts.fields.password, { exact: true }).fill(secret);
  await page.getByRole("button", { name: accounts.signIn.submit, exact: true }).click();
}

async function signOut(page: Page): Promise<void> {
  const layout = locale("layout");
  const menu = page.getByRole("button", { name: layout.menu });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole("button", { name: layout.signOut }).click();
  await expect(page).toHaveURL(urlEndingWith("/"));
}

async function deleteAccount(page: Page): Promise<void> {
  const settings = locale("settings");
  await page.goto(path("/settings"));
  await page.getByRole("tab", { name: settings.tabs.account }).click();
  await page.getByRole("main").getByLabel(settings.account.password).fill(password);
  await page.getByRole("button", { name: settings.account.submit }).click();
  const dialog = page.getByRole("dialog", { name: settings.account.confirmTitle });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: settings.account.confirm }).click();
  await expect(page).toHaveURL(urlEndingWith("/"));
}

test("a visitor signs up, signs in again and deletes the account", async ({ page }) => {
  const accounts = locale("accounts");
  const api = locale("api");
  const email = `e2e-${String(Date.now())}-${test.info().project.name}@example.com`;
  await signUp(page, email);

  await page.goto(await linkMailedTo(email));
  await expect(page).toHaveURL(urlEndingWith("/sign-up/stacks"));
  await expect(page.getByRole("main").getByLabel(accounts.stacks.newsletter)).not.toBeChecked();
  await page.getByRole("main").getByLabel("Laravel").check();
  await page.getByRole("button", { name: accounts.stacks.submit }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: locale("dashboard").title }),
  ).toBeVisible();

  await signOut(page);
  await signIn(page, email, "not the password at all");
  await expect(page.getByRole("alert")).toHaveText(api.errors.invalid_credentials);
  await signIn(page, email);
  await expect(page).toHaveURL(urlEndingWith("/dashboard"));

  await deleteAccount(page);
  await signIn(page, email);
  await expect(page.getByRole("alert")).toHaveText(api.errors.invalid_credentials);
});

test("sign-up shows each error under its field before sending anything", async ({ page }) => {
  const accounts = locale("accounts");
  const api = locale("api");
  await page.goto(path("/sign-up"));
  await page.getByRole("main").getByLabel(accounts.fields.email).fill("pas-une-adresse");
  await page.getByRole("main").getByLabel(accounts.fields.password, { exact: true }).focus();
  await expect(page.locator("#email-error")).toHaveText(api.fields.email_invalid);
  await page.getByRole("button", { name: accounts.signUp.submit }).click();
  await expect(page.locator("#password-error")).toHaveText(api.fields.required);
  await expect(page.getByRole("main").getByLabel(accounts.fields.email)).toBeFocused();
});

test("the sign-up page never scrolls sideways", async ({ page }) => {
  await page.goto(path("/sign-up"));
  await expectNoSidewaysScroll(page);
});
