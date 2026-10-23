import { OrthographicCamera, Scene, Vector3, WebGLRenderer } from "three";
import { frameFor, sceneView } from "./frame";
import { createFrameCap } from "./frameCap";
import { buildWorld, packetAt } from "./sceneWorld";
import type { Palette, World } from "./sceneWorld";

export type SceneLabels = Record<keyof World["anchors"], HTMLElement>;
export type SceneHandle = { recolor: () => void; dispose: () => void };

const loopMs = 5200;
const fps = 30;

/** Reads the DESIGN.md colour tokens at run time, so both themes paint the scene. */
function readPalette(): Palette {
  const style = getComputedStyle(document.documentElement);
  const token = (name: string): string => style.getPropertyValue(`--color-${name}`).trim();
  return {
    paper: token("paper"),
    surface: token("surface"),
    rule: token("rule"),
    strong: token("rule-strong"),
    ink: token("ink"),
  };
}

type Stage = { renderer: WebGLRenderer; camera: OrthographicCamera; scene: Scene; world: World };

function frameCamera(camera: OrthographicCamera, aspect: number): void {
  Object.assign(camera, frameFor(aspect));
  camera.updateProjectionMatrix();
}

function createStage(canvas: HTMLCanvasElement): Stage {
  const renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const camera = new OrthographicCamera();
  camera.far = 100;
  // Front view, barely raised: the node tops show as a thin edge, nothing recedes.
  camera.position.set(0, sceneView.centerY + 4, 20);
  camera.lookAt(0, sceneView.centerY, 0);
  frameCamera(camera, 16 / 6);
  const scene = new Scene();
  const world = buildWorld();
  scene.add(world.root);
  return { renderer, camera, scene, world };
}

function recolor({ renderer, world }: Stage): void {
  const palette = readPalette();
  renderer.setClearColor(palette.surface);
  world.recolor(palette);
}

/** Places each HTML label over the projected point of its anchor. */
function placeLabels({ camera, world }: Stage, labels: SceneLabels, host: HTMLElement): void {
  const { width, height } = host.getBoundingClientRect();
  const point = new Vector3();
  for (const [name, anchor] of Object.entries(world.anchors)) {
    point.copy(anchor).project(camera);
    const label = labels[name as keyof SceneLabels];
    const x = ((point.x + 1) / 2) * width;
    const y = ((1 - point.y) / 2) * height;
    label.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
  }
}

function resize(stage: Stage, labels: SceneLabels, host: HTMLElement): void {
  const { width, height } = host.getBoundingClientRect();
  if (width === 0 || height === 0) return;
  stage.renderer.setSize(width, height, false);
  frameCamera(stage.camera, width / height);
  placeLabels(stage, labels, host);
}

/** Draws at most 30 frames a second, and only while the scene is on screen and the tab visible. */
function startLoop(stage: Stage, isActive: () => boolean): () => void {
  const shouldDraw = createFrameCap(fps);
  let elapsed = 0;
  let last: number | undefined;
  let frame = requestAnimationFrame(function tick(now) {
    frame = requestAnimationFrame(tick);
    if (!isActive()) {
      last = undefined;
      return;
    }
    elapsed += last === undefined ? 0 : now - last;
    last = now;
    if (!shouldDraw(now)) return;
    const { x, opacity } = packetAt(elapsed / loopMs);
    stage.world.packet.position.x = x;
    stage.world.setPacketOpacity(opacity);
    stage.renderer.render(stage.scene, stage.camera);
  });
  return () => {
    cancelAnimationFrame(frame);
  };
}

/** Mounts the webhook scene on a canvas; the returned handle frees every GPU resource. */
export function mountScene(
  host: HTMLElement,
  canvas: HTMLCanvasElement,
  labels: SceneLabels,
): SceneHandle {
  const stage = createStage(canvas);
  recolor(stage);
  resize(stage, labels, host);
  stage.world.setPacketOpacity(0);
  stage.renderer.render(stage.scene, stage.camera);
  let onScreen = true;
  const seen = new IntersectionObserver(([entry]) => {
    onScreen = entry?.isIntersecting ?? false;
  });
  seen.observe(host);
  const sized = new ResizeObserver(() => {
    resize(stage, labels, host);
  });
  sized.observe(host);
  const stop = startLoop(stage, () => onScreen && document.visibilityState === "visible");
  return {
    recolor: () => {
      recolor(stage);
    },
    dispose: () => {
      stop();
      seen.disconnect();
      sized.disconnect();
      stage.world.dispose();
      stage.renderer.dispose();
      stage.renderer.forceContextLoss();
    },
  };
}
