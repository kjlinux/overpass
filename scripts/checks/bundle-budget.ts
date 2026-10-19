export type ManifestChunk = {
  file: string;
  imports?: string[];
  dynamicImports?: string[];
  css?: string[];
  name?: string;
  isDynamicEntry?: boolean;
};
export type Manifest = Record<string, ManifestChunk>;
export type Budget = { jsGzipBytes: number; totalGzipBytes: number };

export const homeBudget: Budget = { jsGzipBytes: 80 * 1024, totalGzipBytes: 200 * 1024 };
export const sceneBudgetBytes = 180 * 1024;
export const homeRoots = [
  "index.html",
  "src/app/HomePage.tsx",
  "src/app/locales/fr.json",
  "src/layout/locales/fr.json",
  "src/components/ui/locales/fr.json",
];
/** Chunks the home page imports on demand; the scene is measured on its own. */
export const homeLazyRoots = ["src/app/HomePage.tsx", "src/home/locales/fr.json"];
export const sceneRoot = "src/home/scene/webhookScene.ts";

/** A dynamic entry that other chunks also import is keyed "_Name-hash.js" instead of by its source. */
function resolveKey(manifest: Manifest, key: string): string | undefined {
  if (manifest[key] !== undefined) return key;
  const name = key.slice(key.lastIndexOf("/") + 1).replace(/\.[^.]+$/, "");
  return Object.keys(manifest).find(
    (candidate) =>
      manifest[candidate]?.isDynamicEntry === true && manifest[candidate].name === name,
  );
}

function collect(manifest: Manifest, roots: string[], follow: (key: string) => string[]) {
  const files = new Set<string>();
  const seen = new Set<string>();
  const visit = (key: string): void => {
    const chunk = manifest[key];
    if (chunk === undefined || seen.has(key)) return;
    seen.add(key);
    files.add(chunk.file);
    for (const css of chunk.css ?? []) files.add(css);
    for (const child of [...(chunk.imports ?? []), ...follow(key)]) visit(child);
  };
  for (const root of roots) {
    const key = resolveKey(manifest, root);
    if (key === undefined) throw new Error(`Budget root missing from build: ${root}`);
    visit(key);
  }
  return [...files].sort();
}

/** Lists the built files a first visit to the home page downloads. */
export function homeAssets(manifest: Manifest, roots: string[]): string[] {
  return collect(manifest, roots, () => []);
}

/** Static imports of the roots plus every chunk they load on demand, minus the excluded ones. */
export function homeLoadAssets(manifest: Manifest, roots: string[], exclude: string[]): string[] {
  const skip = new Set(exclude);
  return collect(manifest, roots, (key) =>
    (manifest[key]?.dynamicImports ?? []).filter((child) => !skip.has(child)),
  );
}

/** One chunk and its static imports, the download its dynamic import triggers at most. */
export function chunkClosure(manifest: Manifest, key: string): string[] {
  return collect(manifest, [key], () => []);
}

const kb = (bytes: number): string => `${(bytes / 1024).toFixed(1)} KB`;
const sum = (sizes: Record<string, number>, keep: (file: string) => boolean): number =>
  Object.entries(sizes)
    .filter(([file]) => keep(file))
    .reduce((total, [, size]) => total + size, 0);

/** Compares gzip sizes with the budget and returns one error per overrun. */
export function checkBudget(sizes: Record<string, number>, budget: Budget): string[] {
  const js = sum(sizes, (file) => file.endsWith(".js"));
  const total = sum(sizes, () => true);
  const errors: string[] = [];
  if (js > budget.jsGzipBytes) {
    errors.push(`Home JavaScript is ${kb(js)} gzip, budget ${kb(budget.jsGzipBytes)}`);
  }
  if (total > budget.totalGzipBytes) {
    errors.push(`Home page is ${kb(total)} gzip, budget ${kb(budget.totalGzipBytes)}`);
  }
  return errors;
}

/** The scene chunk has its own ceiling, outside the home page budget. */
export function checkSceneBudget(sizes: Record<string, number>, limit: number): string[] {
  const total = sum(sizes, () => true);
  return total > limit ? [`Scene chunk is ${kb(total)} gzip, budget ${kb(limit)}`] : [];
}
