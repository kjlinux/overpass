import { readdirSync, readFileSync } from "node:fs";

const catalogFile = /^([a-z]{2,3})\.json$/;

/** Every <code>.json in the folder is a language, so adding one needs no code. */
export function readCatalogs<T>(directory: URL): Partial<Record<string, T>> {
  const codes = readdirSync(directory).flatMap((name) => catalogFile.exec(name)?.[1] ?? []);
  const entries = codes.map((code) => {
    const text = readFileSync(new URL(`${code}.json`, directory), "utf8");
    return [code, JSON.parse(text) as T] as const;
  });
  return Object.fromEntries(entries);
}
