import type { JSX } from "preact";
import { useTranslation } from "react-i18next";

type Label = readonly [x: number, y: number, size: number, style: string, key: string];
type Frame = {
  view: string;
  shown: string;
  rules: readonly number[];
  rail: readonly [number, number, number];
  packet: readonly [number, number, number];
  nodes: readonly (readonly [number, number, number, number])[];
  labels: readonly Label[];
};

const lab = "scene-lab";
const sub = "scene-sub";
const evt = "scene-evt";

/** Prototype B geometry; the packet is listed before the nodes so it never covers a label. */
const wide: Frame = {
  view: "0 0 1600 600",
  shown: "hidden md:block",
  rules: [533, 1066],
  rail: [267, 1333, 250],
  packet: [452, 236, 28],
  nodes: [
    [137, 160, 260, 180],
    [670, 160, 260, 180],
    [1203, 160, 260, 180],
  ],
  labels: [
    [533, 136, 22, evt, "post"],
    [1066, 136, 22, evt, "event"],
    [267, 440, 22, sub, "emitted"],
    [800, 440, 22, sub, "signed"],
    [1333, 440, 22, sub, "received"],
    [267, 250, 44, lab, "operator"],
    [267, 294, 22, sub, "operatorSub"],
    [800, 250, 44, `${lab} scene-inv`, "overpass"],
    [800, 294, 22, `${sub} scene-inv`, "overpassSub"],
    [1333, 250, 44, lab, "localhost"],
    [1333, 294, 22, sub, "localhostSub"],
  ],
};

const tall: Frame = {
  view: "0 0 800 600",
  shown: "md:hidden",
  rules: [267, 533],
  rail: [133, 667, 300],
  packet: [250, 284, 32],
  nodes: [
    [18, 230, 230, 140],
    [285, 230, 230, 140],
    [552, 230, 230, 140],
  ],
  labels: [
    [400, 160, 34, evt, "event"],
    [133, 300, 44, lab, "operator"],
    [133, 346, 34, sub, "operatorShort"],
    [400, 300, 44, `${lab} scene-inv`, "overpass"],
    [400, 346, 34, `${sub} scene-inv`, "overpassSub"],
    [667, 300, 44, lab, "localhost"],
    [667, 346, 34, sub, "localhostShort"],
  ],
};

function Still({ frame }: { frame: Frame }): JSX.Element {
  const { t } = useTranslation();
  const [px, py, size] = frame.packet;
  return (
    <svg class={frame.shown} viewBox={frame.view} aria-hidden="true">
      {frame.rules.map((x) => (
        <line key={x} class="scene-grid" x1={x} y1={0} x2={x} y2={600} />
      ))}
      <line
        class="scene-rail"
        x1={frame.rail[0]}
        y1={frame.rail[2]}
        x2={frame.rail[1]}
        y2={frame.rail[2]}
      />
      <rect class="scene-packet" x={px} y={py} width={size} height={size} />
      {frame.nodes.map(([x, y, w, h], index) => (
        <rect
          key={x}
          class={index === 1 ? "scene-node scene-node-mid" : "scene-node"}
          x={x}
          y={y}
          width={w}
          height={h}
        />
      ))}
      {frame.labels.map(([x, y, fontSize, style, key]) => (
        <text key={key} class={style} x={x} y={y} font-size={fontSize} text-anchor="middle">
          {t(`scene.${key}`)}
        </text>
      ))}
    </svg>
  );
}

/** The still image of the webhook scene, drawn in the same frame the animated scene uses. */
export function StillScene(): JSX.Element {
  return (
    <>
      <Still frame={wide} />
      <Still frame={tall} />
    </>
  );
}
