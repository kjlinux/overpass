import { prefersReducedMotion } from "../hooks/idle";
import { chooseScene } from "./gate";
import type { SceneChoice } from "./gate";

type Connection = { effectiveType?: string; saveData?: boolean };

/** Asks for a WebGL context on a throwaway canvas, then releases it. */
function hasWebgl(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    context?.getExtension("WEBGL_lose_context")?.loseContext();
    return context !== null;
  } catch {
    return false;
  }
}

/** Reads the browser's signals; the WebGL probe runs only when every cheaper check passed. */
export function sceneChoice(): SceneChoice {
  const connection = (navigator as Navigator & { connection?: Connection }).connection;
  const env = {
    width: window.innerWidth,
    reducedMotion: prefersReducedMotion(),
    override: new URLSearchParams(location.search).get("scene"),
    effectiveType: connection?.effectiveType,
    saveData: connection?.saveData,
    webgl: true,
  };
  const cheap = chooseScene(env);
  return cheap.mode === "still" ? cheap : chooseScene({ ...env, webgl: hasWebgl() });
}
