/** Accepts only a path of this site, so ?next= cannot send a member elsewhere. */
export function safeNext(next: string | null, fallback: string): string {
  if (next === null || !next.startsWith("/")) return fallback;
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
