import { useEffect, useRef, useState } from "preact/hooks";
import { prefersReducedMotion } from "../hooks/idle";
import { nextTick, stepOf } from "./sequence";

const tickMs = 700;
const holdTicks = 4;

/** Plays a screen only while it is on screen; with reduced motion it shows the end state at once. */
export function useSequence(steps: number) {
  const ref = useRef<HTMLElement>(null);
  const [tick, setTick] = useState(0);
  const [still, setStill] = useState(false);
  useEffect(() => {
    if (prefersReducedMotion()) {
      setStill(true);
      return undefined;
    }
    let timer: number | undefined;
    const stop = () => {
      window.clearInterval(timer);
      timer = undefined;
    };
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting !== true) {
        stop();
        return;
      }
      timer ??= window.setInterval(() => {
        setTick((current) => nextTick(current, steps, holdTicks));
      }, tickMs);
    });
    if (ref.current !== null) observer.observe(ref.current);
    return () => {
      observer.disconnect();
      stop();
    };
  }, [steps]);
  return { ref, step: still ? steps : stepOf(tick, steps) };
}
