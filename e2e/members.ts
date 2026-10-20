import { expect } from "@playwright/test";
import type { Browser, Page } from "@playwright/test";
import { locale, path } from "./i18n.js";
import { linkMailedTo } from "./outbox.js";

export const password = "une phrase de passe assez longue";

/** The address a test member signs up with, from the name the test gives it. */
export const emailOf = (name: string) => `e2e-${name}@example.com`;

/** Fills and sends the sign-up form, up to the page that asks to open the e-mail. */
export async function signUp(page: Page, email: string): Promise<void> {
  const accounts = locale("accounts");
  await page.goto(path("/sign-up"));
  await page.getByRole("main").getByLabel(accounts.fields.email).fill(email);
  await page.getByRole("main").getByLabel(accounts.fields.password, { exact: true }).fill(password);
  await page.getByRole("main").getByLabel(accounts.fields.country).selectOption("CI");
  await page.getByRole("button", { name: accounts.signUp.submit }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: accounts.signUp.sentTitle }),
  ).toBeVisible();
}

/** Opens the mailed link and skips the stacks step, up to the dashboard. */
export async function confirmSignUp(page: Page, email: string): Promise<void> {
  await page.goto(await linkMailedTo(email));
  await page.getByRole("button", { name: locale("accounts").stacks.submit }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: locale("dashboard").title }),
  ).toBeVisible();
}

/** Signs a new member up through the confirmation e-mail, in a browser context of their own. */
export async function newMember(browser: Browser, name: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await signUp(page, emailOf(name));
  await confirmSignUp(page, emailOf(name));
  return page;
}

/** Signs an existing member in, in a fresh browser context. */
export async function signInAs(browser: Browser, email: string): Promise<Page> {
  const accounts = locale("accounts");
  const page = await (await browser.newContext()).newPage();
  await page.goto(path("/sign-in"));
  await page.getByRole("main").getByLabel(accounts.fields.email).fill(email);
  await page.getByRole("main").getByLabel(accounts.fields.password, { exact: true }).fill(password);
  await page.getByRole("button", { name: accounts.signIn.submit, exact: true }).click();
  return page;
}

/** The public handle of the signed-in member. */
export async function handleOf(page: Page): Promise<string> {
  const me = await page.request.get("/v1/me");
  return ((await me.json()) as { data: { handle: string } }).data.handle;
}
