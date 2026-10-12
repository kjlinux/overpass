import type { BackendModule, ResourceKey } from "i18next";

const loaders: Record<string, () => Promise<{ default: ResourceKey }>> = {
  fr: () => import("./locales/fr.json"),
  en: () => import("./locales/en.json"),
};

/** Loads only the active language file, as its own chunk. */
export const localeBackend: BackendModule = {
  type: "backend",
  init: () => undefined,
  read: (language, _namespace, callback) => {
    const load = loaders[language];
    if (load === undefined) {
      callback(new Error(`No locale file for ${language}`), false);
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
