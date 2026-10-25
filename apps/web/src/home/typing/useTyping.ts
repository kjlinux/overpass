import { useEffect, useState } from "preact/hooks";
import { prefersReducedMotion } from "../hooks/idle";
import { delayOf, firstState, nextState, shownText } from "./typing";

/** Types the phrases in turn; with reduced motion it stays on the first one. */
export function useTyping(phrases: readonly string[], paused: boolean) {
  const [state, setState] = useState(firstState);
  const [still, setStill] = useState(false);
  useEffect(() => {
    setStill(prefersReducedMotion() || phrases.length < 2);
  }, [phrases.length]);
  useEffect(() => {
    if (still || paused) return undefined;
    const timer = window.setTimeout(() => {
      setState(nextState(state, phrases));
    }, delayOf(state));
    return () => {
      window.clearTimeout(timer);
    };
  }, [state, still, paused, phrases]);
  return { text: shownText(still ? firstState() : state, phrases), still };
}
