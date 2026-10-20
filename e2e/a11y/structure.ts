import type { A11yLib } from "./lib.js";

/** WCAG 1.3.1 and 2.4.6: one h1, and no level skipped on the way down. */
export function headingViolations(): string[] {
  const lib = (globalThis as unknown as { overpassA11y: A11yLib }).overpassA11y;
  const headings = [...document.querySelectorAll("h1, h2, h3, h4, h5, h6, [role=heading]")]
    .filter((heading) => heading.closest('[aria-hidden="true"]') === null)
    .filter((heading) => heading.checkVisibility({ visibilityProperty: true }));
  const levelOf = (heading: Element) =>
    Number(heading.getAttribute("aria-level") ?? heading.tagName.slice(1));
  const found: string[] = [];
  const h1 = headings.filter((heading) => levelOf(heading) === 1).length;
  if (h1 !== 1) found.push(`${String(h1)} h1 on the page instead of exactly one`);
  let previous = 1;
  for (const heading of headings) {
    const level = levelOf(heading);
    if (level > previous + 1) {
      const text = heading.textContent.trim().slice(0, 40);
      found.push(
        `heading h${String(level)} after h${String(previous)}: ${lib.cssPath(heading)} "${text}"`,
      );
    }
    previous = level;
  }
  return found;
}

/** WCAG 3.1.1, 2.4.3 and 4.1.1: the page language, the focus order and unique ids. */
export function documentViolations(language: string): string[] {
  const lib = (globalThis as unknown as { overpassA11y: A11yLib }).overpassA11y;
  const found: string[] = [];
  const lang = document.documentElement.lang;
  if (lang !== language) found.push(`html lang is "${lang}" instead of "${language}"`);
  for (const element of document.querySelectorAll("[tabindex]")) {
    if (Number(element.getAttribute("tabindex")) > 0) {
      found.push(`positive tabindex: ${lib.cssPath(element)}`);
    }
  }
  const counts = new Map<string, number>();
  for (const element of document.querySelectorAll("[id]")) {
    counts.set(element.id, (counts.get(element.id) ?? 0) + 1);
  }
  for (const [id, count] of counts) {
    if (count > 1) found.push(`id "${id}" used ${String(count)} times`);
  }
  return found;
}

/** Elements in main that stick out of the viewport, unless a scrolling container holds them. */
export function overflowViolations(): string[] {
  const lib = (globalThis as unknown as { overpassA11y: A11yLib }).overpassA11y;
  const scrolls = (element: Element) => /auto|scroll/.test(getComputedStyle(element).overflowX);
  const found: string[] = [];
  for (const element of document.querySelectorAll("main *")) {
    const box = element.getBoundingClientRect();
    if (box.width === 0 || box.right <= innerWidth + 1) continue;
    const parent = element.parentElement;
    if (parent?.closest("main") && parent.getBoundingClientRect().right > innerWidth + 1) continue;
    let held = false;
    for (let node = element.parentElement; node !== null && !held; node = node.parentElement) {
      held = scrolls(node);
    }
    if (held || !element.checkVisibility({ visibilityProperty: true })) continue;
    found.push(
      `overflow right ${box.right.toFixed(0)} > ${String(innerWidth)}: ${lib.cssPath(element)}`,
    );
  }
  return found;
}
