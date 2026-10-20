import { expect, test } from "@playwright/test";
import type { Browser, Page } from "@playwright/test";
import { path } from "./i18n.js";

/** Running CSS animations and transitions that last longer than 10 ms. */
function longAnimations(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    document
      .getAnimations()
      .filter((animation) => animation.playState === "running")
      .map((animation) => {
        const timing = animation.effect?.getComputedTiming();
        const duration = Number(timing?.duration ?? 0) * (timing?.iterations ?? 1);
        const target = (animation.effect as KeyframeEffect | null)?.target;
        const what =
          animation instanceof CSSTransition
            ? `transition ${animation.transitionProperty}`
            : `animation ${(animation as CSSAnimation).animationName}`;
        return { duration, label: `${what} on ${target?.tagName.toLowerCase() ?? "?"}` };
      })
      .filter((animation) => animation.duration > 10)
      .map((animation) => `${animation.label}: ${String(animation.duration)} ms`),
  );
}

/** Opens a page, then hovers and focuses its first primary control to start any transition. */
async function animate(browser: Browser, route: string, reduce: boolean): Promise<string[]> {
  const context = await browser.newContext(reduce ? { reducedMotion: "reduce" } : {});
  const page = await context.newPage();
  await page.goto(path(route));
  await page.locator("main h1").first().waitFor();
  const seen = await longAnimations(page);
  const control = page.getByRole("main").getByRole("button").first();
  if ((await control.count()) > 0) {
    await control.hover();
    seen.push(...(await longAnimations(page)));
  }
  await context.close();
  return seen;
}

for (const route of ["/", "/routes", "/sandbox"]) {
  test(`with reduced motion, ${route} runs no animation longer than 10 ms`, async ({ browser }) => {
    expect(await animate(browser, route, true)).toEqual([]);
  });
}

test("without reduced motion the home page does animate, so the check above is not vacuous", async ({
  browser,
}) => {
  const seen = await animate(browser, "/", false);
  test.info().annotations.push({ type: "animations", description: seen.join("; ") });
  expect(seen.length).toBeGreaterThan(0);
});
