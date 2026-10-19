export type SceneEnv = {
  width: number;
  reducedMotion: boolean;
  webgl: boolean;
  override: string | null;
  effectiveType?: string | undefined;
  saveData?: boolean | undefined;
};

export type SceneReason = "off" | "narrow" | "reducedMotion" | "saveData" | "slow" | "noWebgl";
export type SceneChoice = { mode: "scene" | "still"; reason: SceneReason | null };

export const sceneMinWidth = 768;
const slowTypes = new Set(["slow-2g", "2g", "3g"]);

/** Decides between the animated scene and the still image, cheapest checks first. */
export function chooseScene(env: SceneEnv): SceneChoice {
  const still = (reason: SceneReason): SceneChoice => ({ mode: "still", reason });
  if (env.override === "off") return still("off");
  if (env.width < sceneMinWidth) return still("narrow");
  if (env.reducedMotion) return still("reducedMotion");
  if (env.saveData === true) return still("saveData");
  if (env.effectiveType !== undefined && slowTypes.has(env.effectiveType)) return still("slow");
  if (!env.webgl) return still("noWebgl");
  return { mode: "scene", reason: null };
}
