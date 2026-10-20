import { existsSync, readdirSync } from "node:fs";
import type { ProviderAdapter } from "@overpass/simulator";

/** dist holds compiled index.js files, src holds index.ts under tsx and vitest. */
const entryNames = ["index.js", "index.ts"];

function isAdapter(value: unknown): value is ProviderAdapter {
  if (typeof value !== "object" || value === null) return false;
  return "identity" in value && "endpoints" in value && "scenarios" in value;
}

function entryOf(directory: URL, folder: string): URL | undefined {
  const base = new URL(`${folder}/`, directory);
  const name = entryNames.find((entry) => existsSync(new URL(entry, base)));
  return name === undefined ? undefined : new URL(name, base);
}

const byRank = (a: ProviderAdapter, b: ProviderAdapter): number =>
  (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER);

/** A renamed folder can leave its old build behind; two copies of one operator fail loudly. */
function unique(adapters: ProviderAdapter[]): ProviderAdapter[] {
  const seen = new Set<string>();
  for (const adapter of adapters) {
    if (seen.has(adapter.identity.id)) {
      throw new Error(`operator ${adapter.identity.id} is declared twice; clean dist and rebuild`);
    }
    seen.add(adapter.identity.id);
  }
  return adapters;
}

/** Each subfolder with an index exporting an adapter is an operator: adding one touches no core file. */
export async function discoverProviders(directory: URL): Promise<ProviderAdapter[]> {
  const folders = readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  const entries = folders.flatMap((folder) => entryOf(directory, folder) ?? []);
  const modules = await Promise.all(
    entries.map((entry) => import(entry.href) as Promise<Record<string, unknown>>),
  );
  return unique(modules.flatMap((module) => Object.values(module).filter(isAdapter))).sort(byRank);
}
