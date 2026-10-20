import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { overflowingElements } from "./a11y/lib.js";

export const narrowWidth = 360;

/** True in the 360 px project, where long scenario runs are skipped. */
export function isPhone(): boolean {
  return (test.info().project.use.viewport?.width ?? 1280) <= narrowWidth;
}

/** Neither the document nor any element of main may stick out to the right. */
export async function expectNoSidewaysScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  expect(await overflowingElements(page)).toEqual([]);
}
