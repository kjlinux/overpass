import { chromium } from "@playwright/test";
import { resolve } from "node:path";
import { serveStatic } from "./checks/h2-static.ts";

// Served over HTTP/2 like production. DevTools "Fast 3G": 562.5 ms latency, 1.6 Mbit/s down and 750 kbit/s up, minus 10 percent.
const fast3g = {
  offline: false,
  latency: 562.5,
  downloadThroughput: (1.6 * 1024 * 1024 * 0.9) / 8,
  uploadThroughput: (750 * 1024 * 0.9) / 8,
};
const largestPaint = `new Promise((resolve) => new PerformanceObserver((list) =>
  resolve(list.getEntries().at(-1)?.startTime ?? 0)).observe({ type: "largest-contentful-paint", buffered: true }))`;
const budgetMs = 3000;
const port = 4173;

/** Time from navigation start until the home title and its demo action are on screen. */
async function measure(url: string): Promise<{ usefulMs: number; lcpMs: number }> {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 360, height: 760 },
      ignoreHTTPSErrors: true,
    });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    await cdp.send("Network.emulateNetworkConditions", fast3g);
    const start = Date.now();
    await page.goto(url, { waitUntil: "commit" });
    await page.locator("main h1").first().waitFor({ state: "visible" });
    await page.locator('main a[href*="demo"], main button').first().waitFor({ state: "visible" });
    const usefulMs = Date.now() - start;
    // Passed as text: the scripts project has Node types only, and this runs in the page.
    const lcpMs = Number(await page.evaluate(largestPaint));
    return { usefulMs, lcpMs };
  } finally {
    await browser.close();
  }
}

const server = await serveStatic(resolve("apps/web/dist"), port);
try {
  const errors: string[] = [];
  for (const language of ["fr", "en"]) {
    const { usefulMs, lcpMs } = await measure(`https://127.0.0.1:${String(port)}/${language}`);
    console.log(`/${language}: useful ${String(usefulMs)} ms, LCP ${lcpMs.toFixed(0)} ms (3G)`);
    if (usefulMs > budgetMs) errors.push(`/${language} took ${String(usefulMs)} ms on 3G`);
  }
  for (const error of errors) console.error(error);
  if (errors.length > 0) process.exitCode = 1;
  else console.log(`Home page useful within ${String(budgetMs)} ms on simulated 3G.`);
} finally {
  server.close();
}
