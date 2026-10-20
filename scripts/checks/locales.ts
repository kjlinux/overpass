import { posix } from "node:path";

export const languageListFile = "packages/shared/src/i18n/languages.ts";

const localeFile = /^((?:apps|packages)\/.+\/locales)\/([^/]+)\.json$/;
const sourceFile = /^(apps|packages)\/[^/]+\/src\/.+\.(ts|tsx)$/;
const testFile = /\.test\.(ts|tsx)$/;
const namedImport = /^\s*import\s+(?!type\s)[^;]*?["']([^"']*\/locales\/[^/"']+\.json)["']/gm;

/** A catalogue imported by its language name forces a code edit for every new language. */
export function findLocaleImports(file: string, content: string): string[] {
  if (!sourceFile.test(file) || testFile.test(file) || file === languageListFile) return [];
  return [...content.matchAll(namedImport)].map(
    (match) => `${file} imports ${match[1] ?? ""}: read the locales folder instead`,
  );
}

function keyPaths(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return [prefix];
  return Object.entries(value).flatMap(([key, item]) =>
    keyPaths(item, prefix === "" ? key : `${prefix}.${key}`),
  );
}

function groupFolders(files: readonly string[]): Map<string, string[]> {
  const folders = new Map<string, string[]>();
  for (const file of files) {
    const match = localeFile.exec(file);
    if (match?.[1] === undefined || match[2] === undefined) continue;
    folders.set(match[1], [...(folders.get(match[1]) ?? []), match[2]]);
  }
  return folders;
}

function checkFolder(
  folder: string,
  codes: readonly string[],
  read: (file: string) => unknown,
  languages: readonly string[],
): string[] {
  const missing = languages.filter((code) => !codes.includes(code));
  const extra = codes.filter((code) => !languages.includes(code));
  const errors = [
    ...missing.map((code) => `${folder} has no ${code}.json`),
    ...extra.map((code) => `${folder}/${code}.json is not a supported language`),
  ];
  const present = languages.filter((code) => codes.includes(code));
  const [reference, ...others] = present.map((code) => posix.join(folder, `${code}.json`));
  if (reference === undefined) return errors;
  const expected = keyPaths(read(reference));
  for (const file of others) {
    const actual = new Set(keyPaths(read(file)));
    const lacking = expected.filter((key) => !actual.has(key));
    const surplus = [...actual].filter((key) => !expected.includes(key));
    errors.push(...lacking.map((key) => `${file} lacks ${key}`));
    errors.push(...surplus.map((key) => `${file} has the extra key ${key}`));
  }
  return errors;
}

/** Every locales folder holds exactly one catalogue per supported language, with the same keys. */
export function checkLocaleFolders(
  files: readonly string[],
  read: (file: string) => unknown,
  languages: readonly string[],
): string[] {
  return [...groupFolders(files)].flatMap(([folder, codes]) =>
    checkFolder(folder, codes, read, languages),
  );
}
