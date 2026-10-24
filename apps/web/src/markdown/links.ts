const allowedProtocols = new Set(["http:", "https:", "mailto:"]);

/** The href when it is an absolute http, https or mailto URL; anything else is dropped. */
export function safeHref(href: string): string | undefined {
  const trimmed = href.trim();
  try {
    const url = new URL(trimmed);
    return allowedProtocols.has(url.protocol) ? trimmed : undefined;
  } catch {
    return undefined;
  }
}

const mediaPath = /^\/v1\/media\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Only images Overpass stores itself; anything else would load from a host the reader never chose. */
export function safeImageSrc(src: string): string | undefined {
  return mediaPath.test(src) ? src : undefined;
}
