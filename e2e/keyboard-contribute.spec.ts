import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { resetRateLimits } from "./admin.js";
import { locale, path } from "./i18n.js";
import { publishRoute, stampOf } from "./itineraries.js";
import { chooseWithArrows, press, startingWith, tabTo } from "./keyboard.js";
import { newMember } from "./members.js";

test.beforeEach(() => resetRateLimits());

/** Fills the editor and publishes with Tab, typing, the arrow keys and Enter only. */
async function publishWithKeyboard(page: Page, title: string): Promise<void> {
  const routes = locale("routes");
  await page.goto(path("/routes/new"));
  await expect(page.locator("main h1")).toBeVisible();
  await tabTo(page, startingWith(routes.editor.title));
  await page.keyboard.type(title);
  const fields: [string, string][] = [
    [routes.editor.service, "wave"],
    [routes.editor.country, "CI"],
    [routes.editor.stack, "laravel"],
  ];
  for (const [label, value] of fields) {
    await tabTo(page, startingWith(label));
    await chooseWithArrows(page, value);
  }
  await tabTo(page, routes.editor.submitCreate);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
}

/** Opens the check dialog, moves the environment radio group to production and confirms. */
async function verifyWithKeyboard(page: Page, url: string): Promise<void> {
  const routes = locale("routes");
  await page.goto(url);
  await expect(page.locator("main h1")).toBeVisible();
  await tabTo(page, routes.detail.verify);
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: routes.dialog.verifyTitle });
  await expect(dialog).toBeVisible();
  // Tab enters a radio group on its checked option; the arrows move the choice.
  await tabTo(page, routes.checks.environment.test);
  await press(page, "ArrowDown");
  await expect(dialog.getByLabel(routes.checks.environment.production)).toBeChecked();
  await tabTo(page, routes.dialog.verifySubmit);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status").filter({ hasText: routes.detail.verified })).toBeVisible();
}

test("Contribute with the keyboard only: publish an itinerary, then verify another one", async ({
  browser,
}) => {
  test.setTimeout(180_000);
  const stamp = stampOf(test.info().project.name);
  const other = await newMember(browser, `kb-author-${stamp}`);
  const otherUrl = await publishRoute(other, `Wave à vérifier au clavier ${stamp}`);
  const member = await newMember(browser, `kb-member-${stamp}`);
  await publishWithKeyboard(member, `Ma fiche publiée au clavier ${stamp}`);
  await verifyWithKeyboard(member, otherUrl);
});
