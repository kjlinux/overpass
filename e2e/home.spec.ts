import { expect, test } from "@playwright/test";
import { locale, path } from "./i18n.js";
import { expectNoSidewaysScroll } from "./layout.js";
import { startWorker } from "./processes.js";
import type { Running } from "./processes.js";

let worker: Running;
test.beforeAll(() => {
  worker = startWorker();
});
test.afterAll(() => {
  worker.stop();
});

test("the demo button takes the keyboard to the embedded demo, which shows a delivered webhook", async ({
  page,
}) => {
  const app = locale("app");
  await page.goto(path("/"));
  await expect(page.getByRole("heading", { level: 1, name: app.app.tagline })).toBeVisible();
  await page.getByRole("button", { name: app.app.demo }).click();
  const run = page.getByRole("button", { name: app.demo.run });
  await expect(run).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status").filter({ hasText: app.demo.live.webhook })).toBeVisible({
    timeout: 30_000,
  });
  // The scene also names the event; only the demo section proves the delivery.
  const demo = page.getByRole("region", { name: app.demo.title });
  await expect(demo.getByText("checkout.session.completed").first()).toBeVisible();
});

test("the figures come from the API, or the section stays hidden, never an error", async ({
  page,
}) => {
  const home = locale("home");
  await page.goto(path("/"));
  await page.getByText(home.signup.text).scrollIntoViewIfNeeded();
  await expect(page.getByLabel(home.countries.loading)).toHaveCount(0, { timeout: 10_000 });
  await expect(page.locator("main [role=alert]")).toHaveCount(0);
  const figures = page.getByRole("list", { name: home.figures.label });
  if ((await figures.count()) > 0) await expect(figures.locator(".home-figure")).toHaveCount(3);
  else await expect(page.locator("#countries")).toHaveCount(0);
});

test("the theme switch is remembered and applied to the root element", async ({ page }) => {
  const layout = locale("layout");
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(path("/"));
  await page.getByRole("button", { name: layout.themeDark }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("button", { name: layout.themeLight })).toBeVisible();
});

test("at 360 px the page never scrolls sideways and shows the still scene", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto(path("/"));
  await expect(page.getByRole("img", { name: locale("app").scene.label })).toBeVisible();
  await expect(page.locator(".home-frame canvas")).toBeHidden();
  await expectNoSidewaysScroll(page);
});

test("scene=off keeps the still image on a wide screen", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${path("/")}?scene=off`);
  await page.waitForTimeout(1500);
  await expect(page.locator(".home-frame svg").first()).toBeVisible();
  await expect(page.locator(".home-frame canvas")).toBeHidden();
});
