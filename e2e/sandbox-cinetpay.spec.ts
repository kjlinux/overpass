import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { format, locale, path } from "./i18n.js";
import { isPhone } from "./layout.js";
import { newMember } from "./members.js";
import { startWorker } from "./processes.js";
import type { Running } from "./processes.js";

let worker: Running;
const texts = () => locale("sandbox");
test.beforeAll(() => {
  worker = startWorker();
});
test.afterAll(() => {
  worker.stop();
});

type Scenario = "success" | "insufficient_funds" | "timeout" | "duplicate_webhook" | "late_webhook";

const trip = (page: Page) => page.getByRole("list", { name: texts().deliveries.trip });

async function run(page: Page, scenario: Scenario): Promise<void> {
  await page.getByRole("radio", { name: texts().scenario[scenario].label }).check();
  await page.getByRole("button", { name: texts().launch.button }).click();
}

test("a member runs every CinetPay scenario and checks the payment", async ({ browser }) => {
  test.skip(isPhone(), "the CinetPay scenarios run once, at desktop width");
  test.setTimeout(300_000);
  const page = await newMember(browser, `cinetpay-${String(Date.now())}`);
  await page.goto(`${path("/sandbox")}?provider=cinetpay`);
  await page.getByRole("button", { name: texts().keys.create }).click();
  for (const scenario of ["success", "insufficient_funds", "duplicate_webhook"] as const) {
    await run(page, scenario);
    await expect(trip(page).first()).toContainText(texts().deliveries.state.passed, {
      timeout: 15_000,
    });
  }
  await expect(page.getByText(texts().deliveries.same)).toBeVisible({ timeout: 20_000 });
  await run(page, "timeout");
  await expect(page.getByText(texts().deliveries.none)).toBeVisible({ timeout: 15_000 });
  const plays = page.getByRole("button", { name: texts().guided.play });
  for (let index = 0; index < 3; index += 1) {
    await plays.nth(index).click();
    await expect(
      page.getByRole("status").filter({ hasText: format(texts().guided.result, { status: 200 }) }),
    ).toHaveCount(index + 1);
  }
  await expect(page.getByText('"status": "PENDING"').last()).toBeVisible();
  await run(page, "late_webhook");
  await expect(trip(page).first()).toContainText(texts().deliveries.state.passed, {
    timeout: 90_000,
  });
});
