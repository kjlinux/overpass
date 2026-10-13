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
