import type { BackendModule, ResourceKey } from "i18next";

type Loader = () => Promise<{ default: ResourceKey }>;

const files = import.meta.glob<{ default: ResourceKey }>("../**/locales/*.json");

/** Derives the namespace from the folder that owns the locales directory. */
export function namespaceOf(path: string): string {
  const owner = path.split("/locales/")[0] ?? "";
  return owner.slice(owner.lastIndexOf("/") + 1);
}

/** Maps "namespace/language" to the loader of that translation file. */
export function indexLoaders(paths: Record<string, Loader>): Map<string, Loader> {
  const index = new Map<string, Loader>();
  for (const [path, load] of Object.entries(paths)) {
    const language = path.slice(path.lastIndexOf("/") + 1).replace(/\.json$/, "");
    index.set(`${namespaceOf(path)}/${language}`, load);
  }
  return index;
}

const loaders = indexLoaders(files);

/** Lists every namespace that owns a translation file. */
export const namespaces = [
  ...new Set([...loaders.keys()].flatMap((key) => key.split("/").slice(0, 1))),
];

/** Loads one translation file per module and language, as its own chunk. */
export const localeBackend: BackendModule = {
  type: "backend",
  init: () => undefined,
  read: (language, namespace, callback) => {
    const load = loaders.get(`${namespace}/${language}`);
    if (load === undefined) {
      callback(new Error(`No locale file for ${namespace}/${language}`), false);
      return;
    }
    load().then(
      (module) => {
        callback(null, module.default);
      },
      (error: unknown) => {
        callback(error instanceof Error ? error : new Error(String(error)), false);
      },
    );
  },
};
