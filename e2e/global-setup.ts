import { chromium } from "@playwright/test";
import type { FullConfig } from "@playwright/test";

const deadlineMs = 120_000;
const pollMs = 250;

/** Polls until the condition holds, failing with a clear message once the deadline passes. */
async function until(label: string, ready: () => Promise<boolean>): Promise<void> {
  const deadline = Date.now() + deadlineMs;
  while (Date.now() < deadline) {
    if (await ready().catch(() => false)) return;
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
  throw new Error(`${label} did not answer within ${String(deadlineMs / 1000)} s`);
}

/** Tests start once the API answers through the web proxy and the first pages are compiled. */
export default async function globalSetup(config: FullConfig): Promise<void> {
  const base = String(config.projects[0]?.use.baseURL);
  await until(
    "API health through the web proxy",
    async () => (await fetch(`${base}/v1/health`)).ok,
  );
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const path of ["/fr/sign-up", "/fr/routes", "/fr/routes/new"]) {
    await page.goto(`${base}${path}`);
    await page.locator("main h1").first().waitFor({ timeout: deadlineMs });
  }
  await browser.close();
}
