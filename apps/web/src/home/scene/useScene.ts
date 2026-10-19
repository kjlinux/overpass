import type { RefObject } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import type { Theme } from "../../layout";
import { nextIdle, onNearView } from "../hooks/idle";
import { onFirstInteraction } from "../hooks/interaction";
import { sceneChoice } from "./environment";
import type { SceneHandle, SceneLabels } from "./webhookScene";

/** Without any interaction the scene starts after this quiet delay; the still image shows until then. */
const quietMs = 3000;

type Refs = {
  host: RefObject<HTMLDivElement | null>;
  canvas: RefObject<HTMLCanvasElement | null>;
  labels: () => SceneLabels | null;
  theme: Theme;
};

/** Loads the scene after the first interaction or 3 s of quiet, once in view, unless the still image wins. */
export function useScene({ host, canvas, labels, theme }: Refs): boolean {
  const [live, setLive] = useState(false);
  const scene = useRef<SceneHandle | undefined>(undefined);
  useEffect(() => {
    scene.current?.recolor();
  }, [theme]);
  useEffect(() => {
    let cancelled = false;
    let stopView = (): void => undefined;
    const mount = async (): Promise<void> => {
      const { mountScene } = await import("./webhookScene");
      await nextIdle();
      const shown = labels();
      if (cancelled || host.current === null || canvas.current === null || shown === null) return;
      scene.current = mountScene(host.current, canvas.current, shown);
      setLive(true);
    };
    const stopTrigger = onFirstInteraction(
      window,
      () => {
        if (host.current === null || sceneChoice().mode === "still") return;
        // A failed chunk or context leaves the still image in place, which is the designed fallback.
        stopView = onNearView(host.current, () => void mount().catch(() => undefined), "0px");
      },
      quietMs,
    );
    return () => {
      cancelled = true;
      stopTrigger();
      stopView();
      scene.current?.dispose();
      scene.current = undefined;
    };
  }, [host, canvas, labels]);
  return live;
}
