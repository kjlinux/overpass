import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { resetRateLimits } from "./admin.js";
import { locale, path, urlEndingWith } from "./i18n.js";
import { stampOf } from "./itineraries.js";
import { focusState, press, startingWith, tabTo } from "./keyboard.js";
import { isPhone } from "./layout.js";
import { emailOf, newMember, password } from "./members.js";
import { startWorker } from "./processes.js";
import type { Running } from "./processes.js";

let worker: Running;
test.beforeAll(() => {
  worker = startWorker();
});
test.afterAll(() => {
  worker.stop();
});

/** Discover: from the home page to a delivered webhook in the embedded demo. */
async function discover(page: Page): Promise<void> {
  const app = locale("app");
  await page.goto(path("/"));
  await expect(
    page.getByRole("heading", { level: 1, name: app.app.taglines[0] ?? "" }),
  ).toBeVisible();
  await tabTo(page, app.app.demo);
  await press(page, "Enter");
  expect((await focusState(page)).name).toBe(app.demo.run);
  await page.keyboard.press("Enter");
  const delivered = page.getByRole("status").filter({ hasText: app.demo.live.webhook });
  await expect(delivered).toBeVisible({ timeout: 30_000 });
}

/** Back up to the header; on a phone the links sit behind the menu, which Escape closes. */
async function reachSignIn(page: Page): Promise<void> {
  const layout = locale("layout");
  if (isPhone()) {
    await tabTo(page, layout.menu, true);
    await press(page, "Enter");
    await press(page, "Escape");
    expect((await focusState(page)).name).toBe(layout.menu);
    await press(page, "Space");
    await tabTo(page, layout.signIn);
  } else {
    await tabTo(page, layout.signIn, true);
  }
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(urlEndingWith("/sign-in"));
}

test("Discover then sign in, with the keyboard only and a visible focus at every step", async ({
  browser,
  page,
}) => {
  test.setTimeout(120_000);
  const accounts = locale("accounts");
  await resetRateLimits();
  const name = `keyboard-${stampOf(test.info().project.name)}`;
  await (await newMember(browser, name)).context().close();

  await discover(page);
  await reachSignIn(page);
  await expect(page.locator("main h1")).toBeVisible();
  await tabTo(page, startingWith(accounts.fields.email));
  await page.keyboard.type(emailOf(name));
  await tabTo(page, startingWith(accounts.fields.password));
  await page.keyboard.type(password);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(urlEndingWith("/dashboard"));
  await expect(
    page.getByRole("heading", { level: 1, name: locale("dashboard").title }),
  ).toBeVisible();
});
