/** Runs the callback once the browser is idle after first render; returns a cancel function. */
export function onIdle(callback: () => void, timeout = 2000): () => void {
  if (typeof window.requestIdleCallback === "function") {
    const handle = window.requestIdleCallback(callback, { timeout });
    return () => {
      window.cancelIdleCallback(handle);
    };
  }
  const timer = window.setTimeout(callback, 200);
  return () => {
    window.clearTimeout(timer);
  };
}

/** Runs the callback the first time the element comes near the viewport. */
export function onNearView(element: Element, callback: () => void, margin = "200px"): () => void {
  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      callback();
    },
    { rootMargin: margin },
  );
  observer.observe(element);
  return () => {
    observer.disconnect();
  };
}

/** Whether the reader asked the system for less motion. */
export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Resolves at the next idle period, to split heavy work into separate tasks. */
export function nextIdle(): Promise<void> {
  return new Promise((resolve) => {
    onIdle(resolve);
  });
}
