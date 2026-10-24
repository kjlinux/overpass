import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { chromium } from "@playwright/test";

const source = "scripts/blog-covers";
const output = "apps/api/content/posts/covers";
const width = 1600;
const height = 900;

/** Draws each SVG cover as a PNG in the 16:9 frame of the blog, for the seeded articles. */
async function draw(): Promise<void> {
  mkdirSync(output, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width, height } });
  for (const file of readdirSync(source).filter((name) => name.endsWith(".svg"))) {
    const svg = readFileSync(join(source, file), "utf8");
    const sized = svg.replace("<svg ", `<svg width="${String(width)}" height="${String(height)}" `);
    await page.setContent(`<body style="margin:0">${sized}</body>`);
    await page.screenshot({ path: join(output, `${basename(file, ".svg")}.png`) });
  }
  await browser.close();
}

await draw();
