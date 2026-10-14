import { posix } from "node:path";

const boundaryPatterns = [
  /^(apps\/api\/src\/modules\/[^/]+)\//,
  /^(apps\/web\/src\/features\/[^/]+)\//,
  /^(packages\/providers\/src\/[^/.]+)\//,
];
const specifierPattern = /(?:\bfrom\s*|\bimport\s*\(?\s*)["']([^"']+)["']/g;

function boundaryOf(path: string): string | undefined {
  for (const pattern of boundaryPatterns) {
    const match = pattern.exec(path);
    if (match?.[1]) return match[1];
  }
  return undefined;
}

function isIndex(target: string, boundary: string): boolean {
  const withoutExtension = target.replace(/\.(ts|tsx|js|jsx)$/, "");
  return withoutExtension === boundary || withoutExtension === `${boundary}/index`;
}

function checkSpecifier(file: string, specifier: string): string | undefined {
  if (/^@overpass\/[^/]+\/.+/.test(specifier)) {
    return `${file} imports ${specifier}: import a package from its root only`;
  }
  if (!specifier.startsWith(".")) return undefined;
  const target = posix.join(posix.dirname(file), specifier);
  const from = boundaryOf(file);
  const to = boundaryOf(`${target}/`);
  if (to === undefined || to === from || isIndex(target, to)) return undefined;
  return `${file} imports ${specifier}: go through ${to}/index.ts`;
}

/** Rejects deep imports across module boundaries and into package internals. */
export function findDeepImports(file: string, content: string): string[] {
  const errors: string[] = [];
  for (const match of content.matchAll(specifierPattern)) {
    const error = match[1] ? checkSpecifier(file, match[1]) : undefined;
    if (error) errors.push(error);
  }
  return errors;
}
