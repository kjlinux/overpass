import type { Page } from "@playwright/test";
import { backgroundOf, blend, contrastRatio, cssPath, hex, luminance, toRgba } from "./color.js";
import { contrastViolations, isShown, textElements } from "./contrast.js";
import { accessibleName, nameFromContent, nameViolations } from "./names.js";
import { documentViolations, headingViolations, overflowViolations } from "./structure.js";

export type Rgba = [number, number, number, number];

const lib = {
  accessibleName,
  backgroundOf,
  blend,
  contrastRatio,
  contrastViolations,
  cssPath,
  documentViolations,
  headingViolations,
  hex,
  isShown,
  luminance,
  nameFromContent,
  nameViolations,
  overflowViolations,
  textElements,
  toRgba,
};

export type A11yLib = typeof lib;

/** Sends the checks to the page as source text: a page cannot import the test's modules. */
async function install(page: Page): Promise<void> {
  const members = Object.entries(lib).map(([key, check]) => `${key}: ${String(check)}`);
  await page.evaluate(`globalThis.overpassA11y = { ${members.join(",\n")} };`);
}

/** Every WCAG AA violation the in-page checks find, one readable line each. */
export async function accessibilityViolations(page: Page, language: string): Promise<string[]> {
  await install(page);
  return page.evaluate((lang) => {
    const checks = (globalThis as unknown as { overpassA11y: A11yLib }).overpassA11y;
    return [
      ...checks.documentViolations(lang),
      ...checks.headingViolations(),
      ...checks.nameViolations(),
      ...checks.contrastViolations(),
    ];
  }, language);
}

/** Elements of main wider than the viewport; html and body clip overflow, so scrollWidth hides them. */
export async function overflowingElements(page: Page): Promise<string[]> {
  await install(page);
  return page.evaluate(() =>
    (globalThis as unknown as { overpassA11y: A11yLib }).overpassA11y.overflowViolations(),
  );
}
