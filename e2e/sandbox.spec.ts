import { createHmac } from "node:crypto";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { expect, test } from "@playwright/test";
import type { Browser, Page } from "@playwright/test";
import sandbox from "../apps/web/src/pages/sandbox/locales/fr.json" with { type: "json" };
import { newMember } from "./members.js";
import { start, startWorker } from "./processes.js";
import type { Running } from "./processes.js";

let worker: Running;
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

const trip = (page: Page) => page.getByRole("list", { name: sandbox.deliveries.trip });

async function trackWithKey(page: Page): Promise<string> {
  await page.goto("/fr/sandbox?provider=wave");
  await page.getByRole("button", { name: sandbox.keys.create }).click();
  const reveal = page.getByRole("status").filter({ hasText: sandbox.keys.revealTitle });
  return (await reveal.locator("code").textContent()) ?? "";
}

async function run(page: Page, scenario: Scenario): Promise<void> {
  await page.getByRole("radio", { name: sandbox.scenario[scenario].label }).check();
  await page.getByRole("button", { name: sandbox.launch.button }).click();
}

test("the public demo shows a webhook within 30 seconds, without an account", async ({ page }) => {
  await page.goto("/fr/sandbox/demo");
  await page.getByRole("radio", { name: sandbox.scenario.duplicate_webhook.label }).check();
  await page.getByRole("button", { name: sandbox.demo.button }).click();
  await expect(page.getByRole("status").filter({ hasText: sandbox.demo.done })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText(sandbox.deliveries.same)).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBe(0);
});

test("a member runs every Wave scenario and receives its webhook", async ({ browser }, info) => {
  test.skip(info.project.name !== "desktop", "the five scenarios run once, at desktop width");
  test.setTimeout(180_000);
  const page = await sharedMember(browser);
  await trackWithKey(page);
  for (const scenario of ["success", "insufficient_funds", "duplicate_webhook"] as const) {
    await run(page, scenario);
    await expect(trip(page).first()).toContainText(sandbox.deliveries.state.passed, {
      timeout: 15_000,
    });
  }
  await expect(page.getByText(sandbox.deliveries.same)).toBeVisible();
  await run(page, "timeout");
  await expect(page.getByText(sandbox.deliveries.none)).toBeVisible({ timeout: 15_000 });
  await run(page, "late_webhook");
  await expect(trip(page).first()).toContainText("part à", { timeout: 15_000 });
  await expect(trip(page).first()).toContainText(sandbox.deliveries.state.passed, {
    timeout: 90_000,
  });
});

test("the local relay replays a webhook whose Wave signature verifies on the developer's server", async ({
  browser,
}, info) => {
  test.skip(info.project.name !== "desktop", "one relay run is enough");
  test.setTimeout(120_000);
  const page = await sharedMember(browser);
  const key = await trackWithKey(page);
  await page.getByRole("radio", { name: sandbox.target.relay.label }).check();
  const secretBlock = page.getByText(sandbox.keys.secret, { exact: true }).locator("xpath=../..");
  const secret = (await secretBlock.locator("code").textContent()) ?? "";
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
  const args = ["listen", "--forward-to", forward, "--key", key, "--api", "http://127.0.0.1:3000"];
  const cli = start("apps/cli/src/cli.ts", args, { OVERPASS_LANG: "fr" });
  await expect.poll(() => cli.output(), { timeout: 20_000 }).toContain("Relais prêt");
  await run(page, "success");
  await expect.poll(() => received.length, { timeout: 20_000 }).toBe(1);
  const [, stamp, v1] = /^t=(\d+),v1=([0-9a-f]+)$/.exec(received[0]?.signature ?? "") ?? [];
  const expected = createHmac("sha256", secret)
    .update(`${stamp ?? ""}${received[0]?.body ?? ""}`)
    .digest("hex");
  expect(expected).toBe(v1);
  await expect(trip(page).first()).toContainText("reçu, 200 en", { timeout: 20_000 });
  cli.stop();
  local.close();
});
