import type { A11yLib } from "./lib.js";

/** Rendered for a sighted reader: visible, not clipped to a pixel, not hidden from assistive tech. */
export function isShown(element: Element): boolean {
  if (element.closest('[aria-hidden="true"], [inert]') !== null) return false;
  if (!element.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return false;
  const box = element.getBoundingClientRect();
  return box.width > 1 && box.height > 1 && box.right > 0 && box.bottom > 0;
}

/** Elements that carry their own text, as opposed to only wrapping other elements. */
export function textElements(): Element[] {
  const skipped = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "OPTION"]);
  return [...document.body.querySelectorAll("*")].filter(
    (element) =>
      !skipped.has(element.tagName) &&
      [...element.childNodes].some(
        (child) => child.nodeType === Node.TEXT_NODE && (child.textContent ?? "").trim() !== "",
      ),
  );
}

/** WCAG 1.4.3: 4.5:1, or 3:1 from 24 px, or from 18.66 px bold. Disabled controls are exempt. */
export function contrastViolations(): string[] {
  const lib = (globalThis as unknown as { overpassA11y: A11yLib }).overpassA11y;
  const found: string[] = [];
  for (const element of lib.textElements()) {
    if (!lib.isShown(element)) continue;
    if (element.closest(':disabled, [aria-disabled="true"]') !== null) continue;
    const style = getComputedStyle(element);
    const background = lib.backgroundOf(element);
    if (background === undefined) continue;
    const text = lib.toRgba(style.color);
    const ink = text[3] < 1 ? lib.blend(text, background) : text;
    const size = parseFloat(style.fontSize);
    const large = size >= 24 || (size >= 18.66 && Number(style.fontWeight) >= 700);
    const needed = large ? 3 : 4.5;
    const ratio = lib.contrastRatio(ink, background);
    if (ratio + 0.005 >= needed) continue;
    const sample = element.textContent.trim().slice(0, 40);
    found.push(
      `contrast ${ratio.toFixed(2)}:1 < ${String(needed)}:1, ${lib.hex(ink)} on ${lib.hex(background)}, ${String(size)}px: ${lib.cssPath(element)} "${sample}"`,
    );
  }
  return found;
}
