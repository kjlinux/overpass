import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { locale, path } from "./i18n.js";

/** Publishes a Wave itinerary from the editor and returns the URL of its page. */
export async function publishRoute(page: Page, title: string, country = "CI"): Promise<string> {
  const routes = locale("routes");
  await page.goto(path("/routes/new"));
  const main = page.getByRole("main");
  await main.getByLabel(routes.editor.title, { exact: true }).fill(title);
  await main.getByLabel(routes.editor.service, { exact: true }).selectOption("wave");
  await main.getByLabel(routes.editor.country, { exact: true }).selectOption(country);
  await main.getByLabel(routes.editor.stack, { exact: true }).selectOption("laravel");
  await page.getByRole("button", { name: routes.editor.submitCreate }).click();
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  return page.url();
}

/** Confirms, from the itinerary page, that it works in production. */
export async function verifyRoute(page: Page, url: string): Promise<void> {
  const routes = locale("routes");
  await page.goto(url);
  await page.getByRole("button", { name: routes.detail.verify }).click();
  const dialog = page.getByRole("dialog", { name: routes.dialog.verifyTitle });
  await dialog.getByLabel(routes.checks.environment.production).check();
  await dialog.getByRole("button", { name: routes.dialog.verifySubmit }).click();
  await expect(page.getByRole("status").filter({ hasText: routes.detail.verified })).toBeVisible();
}

/** A word no other itinerary contains, so the full-text search finds exactly ours. */
export const uniqueWord = (seed: string) =>
  `kpalime${seed.replace(/./g, (char) => String.fromCharCode(97 + (char.charCodeAt(0) % 26)))}`;

/** A stamp unique to this run and project, so parallel projects never share a member. */
export const stampOf = (projectName: string) => `${String(Date.now())}-${projectName}`;
