const events = ["scroll", "pointermove", "keydown", "touchstart"] as const;

/** Runs the callback on the first interaction or after a quiet delay, whichever comes first, once. */
export function onFirstInteraction(
  target: EventTarget,
  callback: () => void,
  delayMs: number,
): () => void {
  const options = { passive: true, capture: true } as const;
  const cancel = (): void => {
    clearTimeout(timer);
    for (const name of events) target.removeEventListener(name, fire, options);
  };
  function fire(): void {
    cancel();
    callback();
  }
  const timer = setTimeout(fire, delayMs);
  for (const name of events) target.addEventListener(name, fire, options);
  return cancel;
}
