import { expect, test } from "@playwright/test";
import type { Browser } from "@playwright/test";
import { accessibilityViolations } from "./a11y/lib.js";
import { currentLanguage, path } from "./i18n.js";
import { memberRoutes, openPage, publicRoutes, resolveRoute, sharedSite } from "./site.js";

const siteFor = (browser: Browser) => sharedSite(browser, "a11y");

// The first test of a project also signs a member up and publishes an itinerary.
test.describe.configure({ timeout: 90_000 });

async function audit(browser: Browser, route: string, dark: boolean, member: boolean) {
  const { session } = await siteFor(browser);
  const options = member ? { dark, session } : { dark };
  const page = await openPage(browser, path(route), options);
  if (dark) await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const violations = await accessibilityViolations(page, currentLanguage());
  await page.context().close();
  return violations;
}

for (const dark of [false, true]) {
  const theme = dark ? "dark" : "light";
  for (const route of publicRoutes) {
    test(`public page ${route} meets WCAG AA checks in the ${theme} theme`, async ({ browser }) => {
      const resolved = resolveRoute(route, await siteFor(browser));
      expect(await audit(browser, resolved, dark, false), `${resolved}, ${theme}`).toEqual([]);
    });
  }
  for (const route of memberRoutes) {
    test(`member page ${route} meets WCAG AA checks in the ${theme} theme`, async ({ browser }) => {
      expect(await audit(browser, route, dark, true), `${route}, ${theme}`).toEqual([]);
    });
  }
}
