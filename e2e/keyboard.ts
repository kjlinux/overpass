import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

type Focus = { name: string; shown: boolean; outlined: boolean; where: string };

/** Describes the focused element: its name, whether it is on screen and whether a ring marks it. */
export async function focusState(page: Page): Promise<Focus> {
  return page.evaluate(() => {
    const element = document.activeElement;
    if (element === null || element === document.body) {
      return { name: "", shown: false, outlined: false, where: "body" };
    }
    const style = getComputedStyle(element);
    const box = element.getBoundingClientRect();
    const onScreen =
      box.width > 0 && box.height > 0 && box.bottom > 0 && box.top < innerHeight && box.right > 0;
    const ring = style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0;
    const name =
      element.getAttribute("aria-label") ??
      (element as HTMLInputElement).labels?.[0]?.textContent ??
      element.textContent;
    return {
      name: name.replace(/\s+/g, " ").trim(),
      shown: onScreen && element.checkVisibility({ opacityProperty: true }),
      outlined: ring || style.boxShadow !== "none",
      where: `${element.tagName.toLowerCase()}${element.id === "" ? "" : `#${element.id}`}`,
    };
  });
}

/** Presses a key and checks that the focus lands on something visible, with a visible ring. */
export async function press(page: Page, key: string): Promise<Focus> {
  await page.keyboard.press(key);
  let focus = await focusState(page);
  // A smooth scroll may still be bringing the focused element into view.
  await expect
    .poll(
      async () => {
        focus = await focusState(page);
        return focus.shown && focus.outlined;
      },
      { timeout: 2_000 },
    )
    .toBe(true)
    .catch(() => undefined);
  expect(focus.shown, `focus hidden after ${key} on ${focus.where} "${focus.name}"`).toBe(true);
  expect(focus.outlined, `no focus ring after ${key} on ${focus.where} "${focus.name}"`).toBe(true);
  return focus;
}

/** Tabs forward (or backward with Shift) until the focused element's name matches. */
export async function tabTo(page: Page, name: string | RegExp, backward = false): Promise<void> {
  const key = backward ? "Shift+Tab" : "Tab";
  const matches = (text: string) => (typeof name === "string" ? text === name : name.test(text));
  for (let step = 0; step < 120; step += 1) {
    if (matches((await press(page, key)).name)) return;
  }
  throw new Error(`the keyboard never reached "${String(name)}"`);
}

/** Matches an accessible name that begins with a label, whatever marks follow it. */
export const startingWith = (text: string): RegExp =>
  new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);

/** Picks an option of the focused select with the arrow keys only, as a keyboard user does. */
export async function chooseWithArrows(page: Page, value: string): Promise<void> {
  const current = () =>
    page.evaluate(() => (document.activeElement as HTMLSelectElement | null)?.value ?? "");
  for (let step = 0; step < 80; step += 1) {
    if ((await current()) === value) return;
    await page.keyboard.press("ArrowDown");
  }
  throw new Error(`the arrow keys never reached the option "${value}"`);
}
