import { supportedLanguages } from "./languages.js";
import type { Language } from "./languages.js";

/** Node only: node:fs is fetched at call time because the browser bundles this package too. */
export function readLocales<T, L extends string = Language>(
  directory: URL,
  languages: readonly L[] = supportedLanguages as readonly string[] as readonly L[],
): Record<L, T> {
  const fs = process.getBuiltinModule("node:fs");
  const entries = languages.map((code) => {
    const text = fs.readFileSync(new URL(`${code}.json`, directory), "utf8");
    return [code, JSON.parse(text) as T] as const;
  });
  return Object.fromEntries(entries) as Record<L, T>;
}
