import { expect, test } from "@playwright/test";
import { locale } from "./i18n.js";
import { resetRateLimits } from "./admin.js";
import { publishRoute, stampOf } from "./itineraries.js";
import { newMember } from "./members.js";
import { startWorker } from "./processes.js";
import type { Running } from "./processes.js";

let worker: Running;
test.beforeAll(() => {
  worker = startWorker();
});
test.afterAll(() => {
  worker.stop();
});
test.beforeEach(() => resetRateLimits());

test("Test: from an itinerary page, the member runs its scenario on the sandbox", async ({
  browser,
}) => {
  test.setTimeout(90_000);
  const [routes, sandbox] = [locale("routes"), locale("sandbox")];
  const stamp = stampOf(test.info().project.name);
  const page = await newMember(browser, `tester-${stamp}`);
  await publishRoute(page, `Wave depuis la fiche ${stamp}`);
  await page.getByRole("link", { name: routes.detail.test }).click();
  await expect(page).toHaveURL(/\/sandbox\?provider=wave&scenario=success$/);
  const success = page.getByRole("radio", { name: sandbox.scenario.success.label });
  await expect(success).toBeChecked();
  await page.getByRole("button", { name: sandbox.keys.create }).click();
  await expect(
    page.getByRole("status").filter({ hasText: sandbox.keys.revealTitle }),
  ).toBeVisible();
  await page.getByRole("button", { name: sandbox.launch.button }).click();
  const trip = page.getByRole("list", { name: sandbox.deliveries.trip });
  await expect(trip.first()).toContainText(sandbox.deliveries.state.passed, { timeout: 15_000 });
});

test("Contribute: a member reports a pothole on an itinerary of someone else", async ({
  browser,
}) => {
  test.setTimeout(90_000);
  const routes = locale("routes");
  const stamp = stampOf(test.info().project.name);
  const author = await newMember(browser, `pothole-author-${stamp}`);
  const url = await publishRoute(author, `Wave avec un piège ${stamp}`);
  const reader = await newMember(browser, `pothole-reader-${stamp}`);
  await reader.goto(url);
  const potholes = reader.getByRole("region", { name: routes.potholes.heading });
  await expect(potholes.getByText(routes.potholes.empty)).toBeVisible();
  await reader.getByRole("button", { name: routes.potholes.report }).click();
  const dialog = reader.getByRole("dialog", { name: routes.dialog.reportTitle });
  const description = `Le webhook arrive sans signature en production ${stamp}`;
  await dialog.getByLabel(routes.dialog.description).fill(description);
  await dialog.getByRole("button", { name: routes.dialog.reportSubmit }).click();
  await expect(
    reader.getByRole("status").filter({ hasText: routes.potholes.reported }),
  ).toBeVisible();
  await expect(potholes.getByText(description)).toBeVisible();
  await expect(potholes.getByText(routes.potholes.status.open, { exact: true })).toBeVisible();
});
