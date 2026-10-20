import { expect, test } from "@playwright/test";
import type { Browser } from "@playwright/test";
import { overflowingElements } from "./a11y/lib.js";
import { currentLanguage, path } from "./i18n.js";
import { isPhone, narrowWidth } from "./layout.js";
import { openPage, publicRoutes, resolveRoute, sharedSite } from "./site.js";

const siteFor = (browser: Browser) => sharedSite(browser, "narrow");

// The first test of a project also signs a member up and publishes an itinerary.
test.describe.configure({ timeout: 90_000 });

for (const route of publicRoutes) {
  test(`at 360 px nothing in main sticks out on ${route}`, async ({ browser }) => {
    // The phone project covers French; the English desktop project narrows its window instead.
    test.skip(!isPhone() && currentLanguage() === "fr", "the 360 px French run covers this page");
    const resolved = resolveRoute(route, await siteFor(browser));
    const page = await openPage(browser, path(resolved), { dark: false });
    await page.setViewportSize({ width: narrowWidth, height: 760 });
    await page.waitForTimeout(250);
    const scrollable = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(scrollable, resolved).toBeLessThanOrEqual(0);
    expect(await overflowingElements(page), resolved).toEqual([]);
    await page.context().close();
  });
}
