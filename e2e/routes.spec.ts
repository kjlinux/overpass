import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import ui from "../apps/web/src/components/ui/locales/fr.json" with { type: "json" };
import routes from "../apps/web/src/pages/routes/locales/fr.json" with { type: "json" };
import { newMember } from "./members.js";

/** A word no other itinerary contains, so the full-text search finds exactly ours. */
const uniqueWord = (seed: string) =>
  `kpalime${seed.replace(/./g, (char) => String.fromCharCode(97 + (char.charCodeAt(0) % 26)))}`;

async function verify(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await page.getByRole("button", { name: routes.detail.verify }).click();
  const dialog = page.getByRole("dialog", { name: routes.dialog.verifyTitle });
  await dialog.getByLabel(routes.checks.environment.production).check();
  await dialog.getByRole("button", { name: routes.dialog.verifySubmit }).click();
  await expect(page.getByRole("status").filter({ hasText: routes.detail.verified })).toBeVisible();
}

test("an itinerary is published, found by search, checked by two others and turns clear", async ({
  browser,
}) => {
  // Three members sign up through their e-mail before the route can turn clear.
  test.setTimeout(90_000);
  const stamp = `${String(Date.now())}-${test.info().project.name}`;
  const word = uniqueWord(stamp);
  const title = `Encaisser Wave depuis Laravel ${word}`;

  const author = await newMember(browser, `author-${stamp}`);
  await author.goto("/fr/routes/new");
  const main = author.getByRole("main");
  await main.getByLabel(routes.editor.title, { exact: true }).fill(title);
  await main.getByLabel(routes.editor.service, { exact: true }).selectOption("wave");
  await main.getByLabel(routes.editor.country, { exact: true }).selectOption("CI");
  await main.getByLabel(routes.editor.stack, { exact: true }).selectOption("laravel");
  await author.getByRole("button", { name: routes.editor.submitCreate }).click();
  await expect(author.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await expect(author.getByText(ui.status.toVerify, { exact: true })).toBeVisible();
  await expect(author.getByRole("button", { name: routes.detail.verify })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await expect(author.getByText(routes.detail.verifyOwn)).toBeVisible();
  const url = author.url();

  const awa = await newMember(browser, `awa-${stamp}`);
  await awa.goto("/fr/routes");
  await awa.getByRole("searchbox", { name: routes.filters.search }).fill(word);
  await awa.getByRole("button", { name: routes.filters.submit, exact: true }).click();
  await awa.getByRole("link", { name: new RegExp(word) }).click();
  await expect(awa).toHaveURL(url);
  await verify(awa, url);
  await expect(awa.getByText(ui.status.toVerify, { exact: true })).toBeVisible();

  const kofi = await newMember(browser, `kofi-${stamp}`);
  await verify(kofi, url);
  await expect(kofi.getByText(ui.status.clear, { exact: true })).toBeVisible();
  await expect(kofi.getByRole("button", { name: routes.detail.verify })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
});

test("the catalogue and the itinerary editor never scroll sideways", async ({ page }) => {
  for (const path of ["/fr/routes", "/fr/routes/new"]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  }
});
