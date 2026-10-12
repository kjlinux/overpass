const base = "https://overpass.invalid";

/** Accepts only a path of this site, so ?next= cannot send a member elsewhere. */
export function safeNext(next: string | null, fallback: string): string {
  if (next === null || !next.startsWith("/") || /[\\\s]/.test(next)) return fallback;
  const url = new URL(next, base);
  return url.origin === base ? `${url.pathname}${url.search}${url.hash}` : fallback;
}
