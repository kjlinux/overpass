import { expect, test } from "@playwright/test";
import { locale, path } from "./i18n.js";
import { publishRoute, stampOf, uniqueWord, verifyRoute } from "./itineraries.js";
import { expectNoSidewaysScroll } from "./layout.js";
import { newMember } from "./members.js";

test("an itinerary is published, found by search, checked by two others and turns clear", async ({
  browser,
}) => {
  // Three members sign up through their e-mail before the route can turn clear.
  test.setTimeout(90_000);
  const [routes, ui] = [locale("routes"), locale("ui")];
  const stamp = stampOf(test.info().project.name);
  const word = uniqueWord(stamp);
  const title = `Encaisser Wave depuis Laravel ${word}`;

  const author = await newMember(browser, `author-${stamp}`);
  const url = await publishRoute(author, title);
  await expect(author.getByText(ui.status.toVerify, { exact: true })).toBeVisible();
  await expect(author.getByRole("button", { name: routes.detail.verify })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await expect(author.getByText(routes.detail.verifyOwn)).toBeVisible();

  const awa = await newMember(browser, `awa-${stamp}`);
  await awa.goto(path("/routes"));
  await awa.getByRole("searchbox", { name: routes.filters.search }).fill(word);
  await awa.getByRole("button", { name: routes.filters.submit, exact: true }).click();
  await awa.getByRole("link", { name: new RegExp(word) }).click();
  await expect(awa).toHaveURL(url);
  await verifyRoute(awa, url);
  await expect(awa.getByText(ui.status.toVerify, { exact: true })).toBeVisible();

  const kofi = await newMember(browser, `kofi-${stamp}`);
  await verifyRoute(kofi, url);
  await expect(kofi.getByText(ui.status.clear, { exact: true })).toBeVisible();
  await expect(kofi.getByRole("button", { name: routes.detail.verify })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
});

test("the catalogue and the itinerary editor never scroll sideways", async ({ page }) => {
  for (const route of ["/routes", "/routes/new"]) {
    await page.goto(path(route));
    await page.locator("main h1").first().waitFor();
    await expectNoSidewaysScroll(page);
  }
});
