import type { A11yLib, Rgba } from "./lib.js";

/* These functions are serialised into the page: they reach each other through globalThis only. */

/** Paints the colour on a 1 px canvas, so any CSS syntax (hex, rgb, oklch) reads back as sRGB. */
export function toRgba(value: string): Rgba {
  const host = globalThis as unknown as { overpassCanvas?: CanvasRenderingContext2D };
  if (host.overpassCanvas === undefined) {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (context === null) throw new Error("no 2d canvas");
    host.overpassCanvas = context;
  }
  const context = host.overpassCanvas;
  context.clearRect(0, 0, 1, 1);
  context.fillStyle = value;
  context.fillRect(0, 0, 1, 1);
  const [r = 0, g = 0, b = 0, a = 0] = context.getImageData(0, 0, 1, 1).data;
  return [r, g, b, a / 255];
}

/** Composites a translucent colour over an opaque one. */
export function blend(top: Rgba, bottom: Rgba): Rgba {
  const mix = (index: 0 | 1 | 2) => top[index] * top[3] + bottom[index] * (1 - top[3]);
  return [mix(0), mix(1), mix(2), 1];
}

/** WCAG relative luminance. */
export function luminance(color: Rgba): number {
  const channel = (value: number) => {
    const s = value / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(color[0]) + 0.7152 * channel(color[1]) + 0.0722 * channel(color[2]);
}

export function contrastRatio(first: Rgba, second: Rgba): number {
  const lib = (globalThis as unknown as { overpassA11y: A11yLib }).overpassA11y;
  const [light, dark] = [lib.luminance(first), lib.luminance(second)].sort((x, y) => y - x);
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
}

export function hex(color: Rgba): string {
  return `#${color
    .slice(0, 3)
    .map((value) => Math.round(value).toString(16).padStart(2, "0"))
    .join("")}`;
}

/** The background under an element: translucent layers over the first opaque one, or undefined over an image. */
export function backgroundOf(element: Element): Rgba | undefined {
  const lib = (globalThis as unknown as { overpassA11y: A11yLib }).overpassA11y;
  const layers: Rgba[] = [];
  for (let node: Element | null = element; node !== null; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (style.backgroundImage !== "none") return undefined;
    const color = lib.toRgba(style.backgroundColor);
    if (color[3] >= 1) return layers.reduceRight((under, layer) => lib.blend(layer, under), color);
    if (color[3] > 0) layers.push(color);
  }
  return layers.reduceRight((under, layer) => lib.blend(layer, under), [255, 255, 255, 1]);
}

/** A short CSS path that points a reader to the element. */
export function cssPath(element: Element): string {
  const parts: string[] = [];
  for (let node: Element | null = element; node !== null && parts.length < 4;) {
    if (node.id !== "") {
      parts.unshift(`#${CSS.escape(node.id)}`);
      break;
    }
    const tagName = node.tagName;
    const tag = tagName.toLowerCase();
    const first = node.classList[0];
    const parent: Element | null = node.parentElement;
    const twins = parent === null ? [] : [...parent.children].filter((c) => c.tagName === tagName);
    const nth = twins.length > 1 ? `:nth-of-type(${String(twins.indexOf(node) + 1)})` : "";
    parts.unshift(`${tag}${first === undefined ? "" : `.${CSS.escape(first)}`}${nth}`);
    node = parent;
  }
  return parts.join(" > ");
}
