import { animate } from "motion";
import { countAt } from "./stats";

/** Raises the number shown in the element from zero to its target in 400 ms; returns a stop. */
export function countUp(element: HTMLElement, target: number, format: (value: number) => string) {
  const controls = animate(0, 1, {
    duration: 0.4,
    ease: "linear",
    onUpdate: (progress) => {
      element.textContent = format(countAt(target, progress));
    },
  });
  return () => {
    controls.stop();
    element.textContent = format(target);
  };
}
