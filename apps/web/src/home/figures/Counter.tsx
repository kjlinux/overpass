import type { JSX } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { onNearView, prefersReducedMotion } from "../hooks/idle";
import { formatCount } from "./stats";

type Props = { value: number; language: string };

/** A figure in large mono that rises once when it first shows; the final value is in the markup. */
export function Counter({ value, language }: Props): JSX.Element {
  const box = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const element = box.current;
    if (element === null || prefersReducedMotion()) return undefined;
    let stop = (): void => undefined;
    let cancelled = false;
    const stopView = onNearView(
      element,
      () => {
        void import("./countUp").then(({ countUp }) => {
          if (!cancelled) stop = countUp(element, value, (n) => formatCount(n, language));
        });
      },
      "0px",
    );
    return () => {
      cancelled = true;
      stopView();
      stop();
    };
  }, [value, language]);
  return (
    <span ref={box} class="home-figure">
      {formatCount(value, language)}
    </span>
  );
}
