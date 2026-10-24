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
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: layout.themeLight }).click();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("button", { name: layout.themeDark })).toBeVisible();
});

test("the tour shows every module at work, and at 360 px nothing scrolls sideways", async ({
  page,
}) => {
  const { tour } = locale("home");
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto(path("/"));
  const region = page.getByRole("region", { name: tour.title });
  await region.scrollIntoViewIfNeeded();
  for (const block of [
    tour.routes,
    tour.track,
    tour.relay,
    tour.mcp,
    tour.discussions,
    tour.blog,
  ]) {
    await expect(region.getByRole("heading", { name: block.title })).toBeVisible();
    await expect(region.getByRole("figure", { name: block.screen.label })).toBeVisible();
  }
  await expectNoSidewaysScroll(page);
});
