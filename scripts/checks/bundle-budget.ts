export type ManifestChunk = { file: string; imports?: string[]; css?: string[] };
export type Manifest = Record<string, ManifestChunk>;
export type Budget = { jsGzipBytes: number; totalGzipBytes: number };

export const homeBudget: Budget = { jsGzipBytes: 80 * 1024, totalGzipBytes: 200 * 1024 };
export const homeRoots = [
  "index.html",
  "src/app/HomePage.tsx",
  "src/app/locales/fr.json",
  "src/layout/locales/fr.json",
  "src/components/ui/locales/fr.json",
];

/** Lists the built files a first visit to the home page downloads. */
export function homeAssets(manifest: Manifest, roots: string[]): string[] {
  const files = new Set<string>();
  const seen = new Set<string>();
  const visit = (key: string): void => {
    const chunk = manifest[key];
    if (chunk === undefined || seen.has(key)) return;
    seen.add(key);
    files.add(chunk.file);
    for (const css of chunk.css ?? []) files.add(css);
    for (const child of chunk.imports ?? []) visit(child);
  };
  for (const root of roots) {
    if (manifest[root] === undefined) throw new Error(`Budget root missing from build: ${root}`);
    visit(root);
  }
  return [...files].sort();
}

/** Compares gzip sizes with the budget and returns one error per overrun. */
export function checkBudget(sizes: Record<string, number>, budget: Budget): string[] {
  const entries = Object.entries(sizes);
  const js = entries.filter(([file]) => file.endsWith(".js")).reduce((sum, [, n]) => sum + n, 0);
  const total = entries.reduce((sum, [, n]) => sum + n, 0);
  const kb = (bytes: number): string => `${(bytes / 1024).toFixed(1)} KB`;
  const errors: string[] = [];
  if (js > budget.jsGzipBytes) {
    errors.push(`Home JavaScript is ${kb(js)} gzip, budget ${kb(budget.jsGzipBytes)}`);
  }
  if (total > budget.totalGzipBytes) {
    errors.push(`Home page is ${kb(total)} gzip, budget ${kb(budget.totalGzipBytes)}`);
  }
  return errors;
}
