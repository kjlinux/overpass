import {
  BoxGeometry,
  Color,
  EdgesGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  Vector3,
} from "three";
import type { BufferGeometry, Material } from "three";

export type Palette = { paper: string; surface: string; rule: string; strong: string; ink: string };

/** Node centres along the road: departure, relay, arrival. */
export const stops = [-7, 0, 7] as const;
const nodeSize = { w: 4.2, h: 2.6, d: 0.6 };

export type World = {
  root: Group;
  packet: Mesh;
  setPacketOpacity: (opacity: number) => void;
  anchors: {
    operator: Vector3;
    overpass: Vector3;
    localhost: Vector3;
    post: Vector3;
    event: Vector3;
  };
  recolor: (palette: Palette) => void;
  dispose: () => void;
};

type Parts = { geometries: BufferGeometry[]; materials: Material[] };

function box(parts: Parts, size: { w: number; h: number; d: number }, fill: MeshBasicMaterial) {
  const geometry = new BoxGeometry(size.w, size.h, size.d);
  const edges = new EdgesGeometry(geometry);
  const line = new LineBasicMaterial();
  parts.geometries.push(geometry, edges);
  parts.materials.push(line);
  const mesh = new Mesh(geometry, fill);
  mesh.add(new LineSegments(edges, line));
  return { mesh, line };
}

type Fills = {
  paper: MeshBasicMaterial;
  ink: MeshBasicMaterial;
  rail: MeshBasicMaterial;
  ground: MeshBasicMaterial;
  packet: MeshBasicMaterial;
};
type Painted = {
  fills: Fills;
  inkLines: LineBasicMaterial[];
  railLine: LineBasicMaterial;
  groundLine: LineBasicMaterial;
};

/** Applies the theme colours read from the page to every material. */
function paint({ fills, inkLines, railLine, groundLine }: Painted, palette: Palette): void {
  fills.paper.color = new Color(palette.paper);
  fills.ink.color = new Color(palette.ink);
  fills.rail.color = new Color(palette.strong);
  fills.ground.color = new Color(palette.rule);
  fills.packet.color = new Color(palette.ink);
  for (const line of inkLines) line.color = new Color(palette.ink);
  railLine.color = new Color(palette.strong);
  groundLine.color = new Color(palette.rule);
}

function anchorsOf(): World["anchors"] {
  const front = nodeSize.d / 2 + 0.01;
  return {
    operator: new Vector3(stops[0], 0, front),
    overpass: new Vector3(stops[1], 0, front),
    localhost: new Vector3(stops[2], 0, front),
    post: new Vector3(-3.5, 2.4, 0),
    event: new Vector3(3.5, 2.4, 0),
  };
}

function createFills(parts: Parts): Fills {
  const fills: Fills = {
    paper: new MeshBasicMaterial(),
    ink: new MeshBasicMaterial(),
    rail: new MeshBasicMaterial(),
    ground: new MeshBasicMaterial(),
    packet: new MeshBasicMaterial({ transparent: true }),
  };
  parts.materials.push(...Object.values(fills));
  return fills;
}

/** One rule under the nodes instead of a receding floor grid, so the band reads as a diagram. */
function createGround(parts: Parts, fills: Fills) {
  const ground = box(parts, { w: 40, h: 0.02, d: 0.02 }, fills.ground);
  ground.mesh.position.y = -nodeSize.h / 2;
  return ground;
}

/** Builds the road, three nodes and the packet; flat materials only, no light, no shadow. */
export function buildWorld(): World {
  const parts: Parts = { geometries: [], materials: [] };
  const fills = createFills(parts);
  const nodes = stops.map((x, index) => {
    const node = box(parts, nodeSize, index === 1 ? fills.ink : fills.paper);
    node.mesh.position.set(x, 0, 0);
    return node;
  });
  const rail = box(parts, { w: 14, h: 0.06, d: 0.06 }, fills.rail);
  const packet = box(parts, { w: 0.5, h: 0.5, d: 0.5 }, fills.packet);
  packet.line.transparent = true;
  const ground = createGround(parts, fills);
  const root = new Group();
  root.add(...nodes.map((node) => node.mesh), rail.mesh, packet.mesh, ground.mesh);
  const painted = {
    fills,
    inkLines: [...nodes, packet].map((node) => node.line),
    railLine: rail.line,
    groundLine: ground.line,
  };
  return {
    root,
    packet: packet.mesh,
    setPacketOpacity: (opacity) => {
      fills.packet.opacity = opacity;
      packet.line.opacity = opacity;
    },
    anchors: anchorsOf(),
    recolor: (palette) => {
      paint(painted, palette);
    },
    dispose: () => {
      for (const geometry of parts.geometries) geometry.dispose();
      for (const material of parts.materials) material.dispose();
    },
  };
}

/** Where the packet is at a phase of the loop: it rests inside the relay, then fades at the ends. */
export function packetAt(phase: number): { x: number; opacity: number } {
  const p = phase - Math.floor(phase);
  const [start, relay, end] = stops;
  const x =
    p < 0.4
      ? start + (relay - start) * (p / 0.4)
      : p < 0.56
        ? relay
        : relay + (end - relay) * ((p - 0.56) / 0.44);
  const opacity = Math.min(1, p / 0.06, (1 - p) / 0.06);
  return { x, opacity };
}
