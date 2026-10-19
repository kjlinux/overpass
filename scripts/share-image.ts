import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";

const source = "apps/web/src/share/share-image.html";
const output = "apps/web/public/share";
const languages = ["fr", "en"];

type Site = { site: { name: string; promise: string } };

/** Draws one 1200x630 share image per language; texts come from the share locales. */
async function draw(): Promise<void> {
  mkdirSync(output, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  for (const language of languages) {
    const file = join("apps/web/src/share/locales", `${language}.json`);
    const { site } = JSON.parse(readFileSync(file, "utf8")) as Site;
    const query = new URLSearchParams({ lang: language, ...site });
    await page.goto(`${pathToFileURL(source).href}?${query.toString()}`);
    await page.waitForFunction("document.fonts.status === 'loaded'");
    await page.screenshot({ path: join(output, `overpass-${language}.png`) });
  }
  await browser.close();
}

await draw();
