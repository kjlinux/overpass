/** The part of the world the band must show: three 7-unit columns, nodes and their two captions. */
export const sceneView = { width: 21, height: 5.4, centerY: 0.7 } as const;

export type Frame = { left: number; right: number; top: number; bottom: number };

/** Orthographic bounds that keep the whole view in a band of this aspect, matching its columns. */
export function frameFor(aspect: number): Frame {
  const halfHeight = Math.max(sceneView.height / 2, sceneView.width / 2 / aspect);
  const halfWidth = halfHeight * aspect;
  return { left: -halfWidth, right: halfWidth, top: halfHeight, bottom: -halfHeight };
}
