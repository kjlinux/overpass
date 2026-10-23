import { afterEach, describe, expect, it, vi } from "vitest";
import { onFirstInteraction } from "../hooks/interaction";
import { createFrameCap } from "./frameCap";
import { frameFor, sceneView } from "./frame";
import { chooseScene } from "./gate";
import type { SceneEnv } from "./gate";

const wide: SceneEnv = { width: 1280, reducedMotion: false, webgl: true, override: null };

describe("chooseScene", () => {
  it("runs the scene on a wide screen with WebGL and a fast connection", () => {
    expect(chooseScene({ ...wide, effectiveType: "4g", saveData: false })).toEqual({
      mode: "scene",
      reason: null,
    });
  });

  it("shows the still image under 768 px", () => {
    expect(chooseScene({ ...wide, width: 767 }).reason).toBe("narrow");
    expect(chooseScene({ ...wide, width: 768 }).mode).toBe("scene");
  });

  it("shows the still image on 2g, 3g or save-data", () => {
    expect(chooseScene({ ...wide, effectiveType: "3g" }).reason).toBe("slow");
    expect(chooseScene({ ...wide, effectiveType: "slow-2g" }).reason).toBe("slow");
    expect(chooseScene({ ...wide, saveData: true }).reason).toBe("saveData");
  });

  it("shows the still image under reduced motion or without WebGL", () => {
    expect(chooseScene({ ...wide, reducedMotion: true }).reason).toBe("reducedMotion");
    expect(chooseScene({ ...wide, webgl: false }).reason).toBe("noWebgl");
  });

  it("honours the measurement switch scene=off", () => {
    expect(chooseScene({ ...wide, override: "off" })).toEqual({ mode: "still", reason: "off" });
  });
});

describe("createFrameCap", () => {
  it("draws about 30 frames out of 60 display ticks in a second", () => {
    const shouldDraw = createFrameCap(30);
    const ticks = Array.from({ length: 60 }, (_, index) => (index * 1000) / 60);
    expect(ticks.filter((now) => shouldDraw(now))).toHaveLength(30);
  });

  it("never draws more often than the cap on a 144 Hz screen", () => {
    const shouldDraw = createFrameCap(30);
    const ticks = Array.from({ length: 144 }, (_, index) => (index * 1000) / 144);
    expect(ticks.filter((now) => shouldDraw(now)).length).toBeLessThanOrEqual(30);
  });
});

describe("frameFor", () => {
  it("fits the three columns across a wide band", () => {
    const frame = frameFor(16 / 6);
    expect(frame.right - frame.left).toBeCloseTo(sceneView.width);
    expect(frame.top - frame.bottom).toBeGreaterThanOrEqual(sceneView.height);
  });

  it("keeps the whole height on a squat band, widening instead", () => {
    const frame = frameFor(6);
    expect(frame.top - frame.bottom).toBeCloseTo(sceneView.height);
    expect(frame.right - frame.left).toBeGreaterThan(sceneView.width);
  });

  it("keeps the band's own proportions", () => {
    const frame = frameFor(2);
    expect((frame.right - frame.left) / (frame.top - frame.bottom)).toBeCloseTo(2);
  });
});

describe("onFirstInteraction", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("fires once on the first scroll, pointer move, key or touch, then stops listening", () => {
    vi.useFakeTimers();
    const target = new EventTarget();
    const callback = vi.fn();
    onFirstInteraction(target, callback, 3000);
    target.dispatchEvent(new Event("pointermove"));
    target.dispatchEvent(new Event("keydown"));
    vi.advanceTimersByTime(5000);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("fires after the inactivity delay when nobody interacts", () => {
    vi.useFakeTimers();
    const target = new EventTarget();
    const callback = vi.fn();
    onFirstInteraction(target, callback, 3000);
    vi.advanceTimersByTime(2999);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    target.dispatchEvent(new Event("scroll"));
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("does nothing once cancelled", () => {
    vi.useFakeTimers();
    const target = new EventTarget();
    const callback = vi.fn();
    const cancel = onFirstInteraction(target, callback, 3000);
    cancel();
    target.dispatchEvent(new Event("touchstart"));
    vi.advanceTimersByTime(5000);
    expect(callback).not.toHaveBeenCalled();
  });
});
