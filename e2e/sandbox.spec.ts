import { createHmac } from "node:crypto";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { expect, test } from "@playwright/test";
import type { Browser, Page } from "@playwright/test";
import { currentLanguage, format, lead, locale, path } from "./i18n.js";
import { expectNoSidewaysScroll, isPhone } from "./layout.js";
import { newMember } from "./members.js";
import { start, startWorker } from "./processes.js";
import type { Running } from "./processes.js";

let worker: Running;
const texts = () => locale("sandbox");
let member: Page | undefined;

/** One sign-up for the whole file: sign-ups are limited per address, like in production. */
async function sharedMember(browser: Browser): Promise<Page> {
  member ??= await newMember(browser, `track-${String(Date.now())}`);
  return member;
}
test.beforeAll(() => {
  worker = startWorker();
});
test.afterAll(() => {
  worker.stop();
});

type Scenario = "success" | "insufficient_funds" | "timeout" | "duplicate_webhook" | "late_webhook";

const trip = (page: Page) => page.getByRole("list", { name: texts().deliveries.trip });

async function trackWithKey(page: Page): Promise<string> {
  await page.goto(`${path("/sandbox")}?provider=wave`);
  await page.getByRole("button", { name: texts().keys.create }).click();
  const reveal = page.getByRole("status").filter({ hasText: texts().keys.revealTitle });
  return (await reveal.locator("code").textContent()) ?? "";
}

async function run(page: Page, scenario: Scenario): Promise<void> {
  await page.getByRole("radio", { name: texts().scenario[scenario].label }).check();
  await page.getByRole("button", { name: texts().launch.button }).click();
}

test("the public demo shows a webhook within 30 seconds, without an account", async ({ page }) => {
  await page.goto(path("/sandbox/demo"));
  await page.getByRole("radio", { name: texts().scenario.duplicate_webhook.label }).check();
  await page.getByRole("button", { name: texts().demo.button }).click();
  await expect(page.getByRole("status").filter({ hasText: texts().demo.done })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText(texts().deliveries.same)).toBeVisible();
  await expectNoSidewaysScroll(page);
});

test("a member runs every Wave scenario and receives its webhook", async ({ browser }) => {
  test.skip(isPhone(), "the five scenarios run once, at desktop width");
  test.setTimeout(180_000);
  const page = await sharedMember(browser);
  await trackWithKey(page);
  for (const scenario of ["success", "insufficient_funds", "duplicate_webhook"] as const) {
    await run(page, scenario);
    await expect(trip(page).first()).toContainText(texts().deliveries.state.passed, {
      timeout: 15_000,
    });
  }
  await expect(page.getByText(texts().deliveries.same)).toBeVisible();
  await run(page, "timeout");
  await expect(page.getByText(texts().deliveries.none)).toBeVisible({ timeout: 15_000 });
  await run(page, "late_webhook");
  await expect(trip(page).first()).toContainText(lead(texts().deliveries.state.leaves), {
    timeout: 15_000,
  });
  await expect(trip(page).first()).toContainText(texts().deliveries.state.passed, {
    timeout: 90_000,
  });
});

/** The developer's local server, which records every webhook the relay forwards. */
async function developerServer() {
  const received: { signature: string; body: string }[] = [];
  const local = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      received.push({
        signature: String(request.headers["wave-signature"]),
        body: Buffer.concat(chunks).toString("utf8"),
      });
      response.writeHead(200).end();
    });
  });
  await new Promise<void>((resolve) => local.listen(0, "127.0.0.1", resolve));
  const forward = `http://127.0.0.1:${String((local.address() as AddressInfo).port)}/webhook`;
  return { local, received, forward };
}

test("the local relay replays a webhook whose Wave signature verifies on the developer's server", async ({
  browser,
}) => {
  test.skip(isPhone(), "one relay run is enough");
  test.setTimeout(120_000);
  const page = await sharedMember(browser);
  const key = await trackWithKey(page);
  await page.getByRole("radio", { name: texts().target.relay.label }).check();
  const secretBlock = page.getByText(texts().keys.secret, { exact: true }).locator("xpath=../..");
  const secret = (await secretBlock.locator("code").textContent()) ?? "";
  const { local, received, forward } = await developerServer();
  const args = ["listen", "--forward-to", forward, "--key", key, "--api", "http://127.0.0.1:3000"];
  const cli = start("apps/cli/src/cli.ts", args, { OVERPASS_LANG: currentLanguage() });
  await expect.poll(() => cli.output(), { timeout: 20_000 }).toContain(lead(locale("cli").ready));
  await run(page, "success");
  await expect.poll(() => received.length, { timeout: 20_000 }).toBe(1);
  const [, stamp, v1] = /^t=(\d+),v1=([0-9a-f]+)$/.exec(received[0]?.signature ?? "") ?? [];
  const expected = createHmac("sha256", secret)
    .update(`${stamp ?? ""}${received[0]?.body ?? ""}`)
    .digest("hex");
  expect(expected).toBe(v1);
  await expect(trip(page).first()).toContainText(
    lead(format(texts().deliveries.state.received, { status: 200 })),
    { timeout: 20_000 },
  );
  cli.stop();
  local.close();
});

test("a member runs every PI-SPI scenario and plays the guided demo", async ({ browser }) => {
  test.skip(isPhone(), "the PI-SPI scenarios run once, at desktop width");
  test.setTimeout(300_000);
  const page = await sharedMember(browser);
  await page.goto(`${path("/sandbox")}?provider=pi-spi`);
  await expect(page.getByRole("note")).toContainText("mTLS");
  await expect(page.getByRole("link", { name: texts().provider.officialSandbox })).toBeVisible();
  await page.getByRole("button", { name: texts().keys.create }).click();
  for (const scenario of [
    "success",
    "insufficient_funds",
    "timeout",
    "duplicate_webhook",
  ] as const) {
    await run(page, scenario);
    await expect(trip(page).first()).toContainText(texts().deliveries.state.passed, {
      timeout: 15_000,
    });
  }
  await expect(page.getByText(texts().deliveries.same)).toBeVisible({ timeout: 20_000 });
  const plays = page.getByRole("button", { name: texts().guided.play });
  for (let index = 0; index < 3; index += 1) {
    await plays.nth(index).click();
    await expect(
      page.getByRole("status").filter({ hasText: format(texts().guided.result, { status: 200 }) }),
    ).toHaveCount(index + 1);
  }
  await expect(page.getByText('"statut": "IRREVOCABLE"')).toBeVisible();
  await run(page, "late_webhook");
  await expect(trip(page).first()).toContainText(texts().deliveries.state.passed, {
    timeout: 90_000,
  });
});

test("a member runs every PayDunya scenario and checks the invoice", async ({ browser }) => {
  test.skip(isPhone(), "the PayDunya scenarios run once, at desktop width");
  test.setTimeout(300_000);
  const page = await sharedMember(browser);
  await page.goto(`${path("/sandbox")}?provider=paydunya`);
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
  for (let index = 0; index < 2; index += 1) {
    await plays.nth(index).click();
    await expect(
      page.getByRole("status").filter({ hasText: format(texts().guided.result, { status: 200 }) }),
    ).toHaveCount(index + 1);
  }
  await expect(page.getByText('"status": "pending"')).toBeVisible();
  await run(page, "late_webhook");
  await expect(trip(page).first()).toContainText(texts().deliveries.state.passed, {
    timeout: 90_000,
  });
});
