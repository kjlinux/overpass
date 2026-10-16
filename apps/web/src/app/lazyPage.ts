import i18next from "i18next";
import type { FunctionComponent } from "preact";
import { lazy } from "preact-iso";

/** Loads a page chunk together with the translation files it renders. */
export function lazyPage<Props>(
  namespace: string | string[],
  load: () => Promise<FunctionComponent<Props>>,
): FunctionComponent<Props> {
  return lazy(async () => {
    await i18next.loadNamespaces(namespace);
    return load();
  });
}
