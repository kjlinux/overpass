import { redactionMask, rules } from "./patterns.js";
import type { Range } from "./patterns.js";

export type Redacted = { text: string; found: number };

/** Sorted, non-overlapping ranges, so one secret matched by two rules counts once. */
function merge(ranges: Range[]): Range[] {
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  return sorted.reduce<Range[]>((merged, range) => {
    const last = merged[merged.length - 1];
    if (last !== undefined && range.start <= last.end) {
      return [...merged.slice(0, -1), { start: last.start, end: Math.max(last.end, range.end) }];
    }
    return [...merged, range];
  }, []);
}

/** Masks keys, tokens and passwords pasted by mistake; the web preview and the API share it. */
export function redactSecrets(text: string): Redacted {
  const ranges = merge(rules.flatMap((rule) => rule(text)));
  let result = text;
  for (const range of [...ranges].reverse()) {
    result = result.slice(0, range.start) + redactionMask + result.slice(range.end);
  }
  return { text: result, found: ranges.length };
}
