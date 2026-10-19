import "./scene.css";
import type { JSX } from "preact";
import { useCallback, useRef } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { cx } from "../../components/ui";
import { useTheme } from "../../layout";
import { StillScene } from "./StillScene";
import { useScene } from "./useScene";
import type { SceneLabels } from "./webhookScene";

const names = ["wave", "overpass", "localhost", "post", "event"] as const;
const subs: Partial<Record<(typeof names)[number], string>> = {
  wave: "scene.waveSub",
  overpass: "scene.overpassSub",
  localhost: "scene.localhostSub",
};

/** HTML text over the canvas, so the labels stay translatable and sharp; positions come from the scene. */
function Labels(): JSX.Element {
  const { t } = useTranslation();
  return (
    <>
      {names.map((name) => {
        const sub = subs[name];
        const code = name === "post" || name === "event";
        return (
          <div
            key={name}
            data-label={name}
            class={cx("scene-label", name === "overpass" && "is-inverse", code && "font-code")}
          >
            {code ? (
              <span class="text-ink">{t(`scene.${name}`)}</span>
            ) : (
              <b>{t(`scene.${name}`)}</b>
            )}
            {sub === undefined ? null : <span>{t(sub)}</span>}
          </div>
        );
      })}
    </>
  );
}

/** One frame: the still image first, replaced by the canvas and its HTML labels once the scene runs. */
export function SceneHost(): JSX.Element {
  const { t } = useTranslation();
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const labelBox = useRef<HTMLDivElement>(null);
  const labels = useCallback((): SceneLabels | null => {
    const box = labelBox.current;
    if (box === null) return null;
    const pick = (name: string) => box.querySelector<HTMLElement>(`[data-label="${name}"]`);
    const found = names.map((name) => [name, pick(name)] as const);
    if (found.some(([, element]) => element === null)) return null;
    return Object.fromEntries(found) as SceneLabels;
  }, []);
  const theme = useTheme();
  const live = useScene({ host, canvas, labels, theme });
  return (
    <div ref={host} class="home-frame" role="img" aria-label={t("scene.label")}>
      {live ? null : <StillScene />}
      <canvas ref={canvas} hidden={!live} aria-hidden="true" />
      <div ref={labelBox} hidden={!live} aria-hidden="true">
        <Labels />
      </div>
    </div>
  );
}
