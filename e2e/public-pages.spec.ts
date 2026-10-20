import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { currentLanguage, locale, path, urlEndingWith } from "./i18n.js";
import { expectNoSidewaysScroll } from "./layout.js";

/** The title and the keyboard-reachable action of each page, in the project's language. */
function pageTexts() {
  const [about, legal, pricing] = [locale("about"), locale("legal"), locale("pricing")];
  return {
    "/pricing": { title: pricing.title, action: pricing.plans.free.action },
    "/about": { title: about.title, action: about.product.action },
    "/legal": { title: legal.legal.title, action: undefined },
    "/privacy": { title: legal.privacy.title, action: legal.deletion.action },
  };
}

/** Words of a checkout button, which the pricing page must not show yet. */
const checkoutWords = { fr: /payer|acheter/i, en: /\b(pay|buy|checkout)\b/i } as const;

/** Tabs until the focused element has the given accessible name, or gives up. */
async function tabTo(page: Page, name: string): Promise<boolean> {
  for (let step = 0; step < 80; step += 1) {
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => document.activeElement?.textContent.trim() ?? "");
    if (focused === name) return true;
  }
  return false;
}

for (const route of ["/pricing", "/about", "/legal", "/privacy"] as const) {
  test(`${route} reads at any width and its action is reachable by keyboard`, async ({ page }) => {
    const { title, action } = pageTexts()[route];
    await page.goto(path(route));
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expectNoSidewaysScroll(page);
    if (action === undefined) return;
    expect(await tabTo(page, action)).toBe(true);
    await expect(page.locator(":focus")).toHaveCSS("outline-style", "solid");
  });
}

test("the pricing page names payment as coming and shows no checkout", async ({ page }) => {
  await page.goto(path("/pricing"));
  await expect(page.getByText(locale("pricing").payment.label)).toBeVisible();
  await expect(page.getByRole("button", { name: checkoutWords[currentLanguage()] })).toHaveCount(0);
});

test("the licence list opens with the keyboard", async ({ page }) => {
  await page.goto(`${path("/legal")}#licences`);
  const first = page.locator("#licences ~ div summary").first();
  await first.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#licences ~ div details").first()).toHaveAttribute("open", "");
});

test("client-side navigation updates the title and the share tags", async ({ page }) => {
  const share = locale("share");
  await page.goto(path("/about"));
  await expect(page).toHaveTitle(`${share.pages.about.title} · Overpass`);
  await page.goto(path("/legal"));
  await page
    .getByRole("contentinfo")
    .getByRole("link", { name: share.pages.privacy.title })
    .click();
  await expect(page).toHaveTitle(`${share.pages.privacy.title} · Overpass`);
  const canonical = page.locator('link[rel="canonical"]');
  await expect(canonical).toHaveCount(1);
  await expect(canonical).toHaveAttribute("href", urlEndingWith("/privacy"));
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    share.pages.privacy.description,
  );
});
