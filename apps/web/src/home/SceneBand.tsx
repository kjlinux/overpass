import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { SceneHost } from "./scene/SceneHost";

const columns = ["departure", "relay", "arrival"] as const;

/** A full-width surface band of three ruled columns holding the webhook scene. */
export function SceneBand(): JSX.Element {
  const { t } = useTranslation();
  return (
    <div class="home-bleed border-y border-rule bg-surface">
      <figure class="mx-auto max-w-frame px-4 md:px-6 lg:px-8" aria-labelledby="scene-caption">
        <div class="border-x border-rule">
          <div
            class="grid grid-cols-3 border-b border-rule text-caption text-ink-2"
            aria-hidden="true"
          >
            {columns.map((column) => (
              <span key={column} class="border-r border-rule px-3 py-2 last:border-r-0">
                {t(`scene.${column}`)}
              </span>
            ))}
          </div>
          <SceneHost />
          <figcaption
            id="scene-caption"
            class="border-t border-rule px-3 py-2 text-caption text-ink-2"
          >
            {t("scene.caption")}
          </figcaption>
        </div>
      </figure>
    </div>
  );
}
