import type { A11yLib } from "./lib.js";

/** The name a screen reader computes from the content, skipping what it never announces. */
export function nameFromContent(element: Element): string {
  const lib = (globalThis as unknown as { overpassA11y: A11yLib }).overpassA11y;
  let name = "";
  for (const child of element.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) name += child.textContent ?? "";
    if (!(child instanceof Element) || child.getAttribute("aria-hidden") === "true") continue;
    const style = getComputedStyle(child);
    if (style.display === "none" || style.visibility === "hidden") continue;
    const label = child.getAttribute("aria-label") ?? "";
    if (label.trim() !== "") name += ` ${label}`;
    else if (child instanceof HTMLImageElement) name += ` ${child.alt}`;
    else if (child.tagName.toLowerCase() === "title") name += ` ${child.textContent}`;
    else name += ` ${lib.nameFromContent(child)}`;
  }
  return name.replace(/\s+/g, " ").trim();
}

/** A simplified accessible name computation: labelledby, label, form labels, title, then content. */
export function accessibleName(element: Element): string {
  const lib = (globalThis as unknown as { overpassA11y: A11yLib }).overpassA11y;
  const ids = (element.getAttribute("aria-labelledby") ?? "").split(/\s+/).filter(Boolean);
  const labelledBy = ids.map((id) => document.getElementById(id)?.textContent ?? "").join(" ");
  const candidates = [labelledBy, element.getAttribute("aria-label") ?? ""];
  const control = element as HTMLInputElement;
  const formControl = ["INPUT", "SELECT", "TEXTAREA"].includes(element.tagName);
  if (formControl) {
    candidates.push(...[...(control.labels ?? [])].map((label) => lib.nameFromContent(label)));
    if (["submit", "button", "reset"].includes(control.type)) candidates.push(control.value);
    if (control.type === "image") candidates.push(control.alt);
  }
  candidates.push(element.getAttribute("title") ?? "");
  if (formControl) candidates.push(element.getAttribute("placeholder") ?? "");
  else candidates.push(lib.nameFromContent(element));
  return candidates.find((candidate) => candidate.trim() !== "")?.trim() ?? "";
}

/** WCAG 4.1.2 and 1.1.1: every control has a name, every image has an alt attribute. */
export function nameViolations(): string[] {
  const lib = (globalThis as unknown as { overpassA11y: A11yLib }).overpassA11y;
  const roles = ["button", "link", "tab", "checkbox", "radio", "switch", "menuitem"];
  const selector = [
    "a[href]",
    "button",
    "input:not([type=hidden])",
    "select",
    "textarea",
    "[tabindex]",
    ...roles.map((role) => `[role=${role}]`),
  ].join(", ");
  const found: string[] = [];
  for (const element of document.querySelectorAll(selector)) {
    if (element.matches("[tabindex]:not(a, button, input, select, textarea, [role])")) {
      if (Number(element.getAttribute("tabindex")) < 0) continue;
    }
    if (element.closest('[aria-hidden="true"], [inert]') !== null) continue;
    if (!element.checkVisibility({ visibilityProperty: true })) continue;
    if (lib.accessibleName(element) === "")
      found.push(`no accessible name: ${lib.cssPath(element)}`);
  }
  for (const image of document.querySelectorAll("img:not([alt])")) {
    if (image.matches('[role=presentation], [role=none], [aria-hidden="true"]')) continue;
    found.push(`img without alt: ${lib.cssPath(image)}`);
  }
  return found;
}
