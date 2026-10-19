import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import about from "../apps/web/src/pages/about/locales/fr.json" with { type: "json" };
import legal from "../apps/web/src/pages/legal/locales/fr.json" with { type: "json" };
import pricing from "../apps/web/src/pages/pricing/locales/fr.json" with { type: "json" };
import share from "../apps/web/src/share/locales/fr.json" with { type: "json" };

const pages = [
  { path: "/fr/pricing", title: pricing.title, action: pricing.plans.free.action },
  { path: "/fr/about", title: about.title, action: about.product.action },
  { path: "/fr/legal", title: legal.legal.title, action: undefined },
  { path: "/fr/privacy", title: legal.privacy.title, action: legal.deletion.action },
] as const;

const overflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - innerWidth);

/** Tabs until the focused element has the given accessible name, or gives up. */
async function tabTo(page: Page, name: string): Promise<boolean> {
  for (let step = 0; step < 80; step += 1) {
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => document.activeElement?.textContent.trim() ?? "");
    if (focused === name) return true;
  }
  return false;
}

for (const { path, title, action } of pages) {
  test(`${path} reads at any width and its action is reachable by keyboard`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    expect(await overflow(page)).toBe(0);
    if (action === undefined) return;
    expect(await tabTo(page, action)).toBe(true);
    await expect(page.locator(":focus")).toHaveCSS("outline-style", "solid");
  });
}

test("the pricing page names payment as coming and shows no checkout", async ({ page }) => {
  await page.goto("/fr/pricing");
  await expect(page.getByText(pricing.payment.label)).toBeVisible();
  await expect(page.getByRole("button", { name: /payer|acheter/i })).toHaveCount(0);
});

test("the licence list opens with the keyboard", async ({ page }) => {
  await page.goto("/fr/legal#licences");
  const first = page.locator("#licences ~ div summary").first();
  await first.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#licences ~ div details").first()).toHaveAttribute("open", "");
});

test("client-side navigation updates the title and the share tags", async ({ page }) => {
  await page.goto("/fr/about");
  await expect(page).toHaveTitle(`${share.pages.about.title} · Overpass`);
  await page.goto("/fr/legal");
  await page
    .getByRole("contentinfo")
    .getByRole("link", { name: share.pages.privacy.title })
    .click();
  await expect(page).toHaveTitle(`${share.pages.privacy.title} · Overpass`);
  const canonical = page.locator('link[rel="canonical"]');
  await expect(canonical).toHaveCount(1);
  await expect(canonical).toHaveAttribute("href", /\/fr\/privacy$/);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    share.pages.privacy.description,
  );
});
