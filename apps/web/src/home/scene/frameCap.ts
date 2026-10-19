/** Returns a gate that lets at most `fps` frames through per second of timestamps. */
export function createFrameCap(fps: number): (now: number) => boolean {
  const interval = 1000 / fps;
  // A few milliseconds of slack keep a 60 Hz screen on every other frame despite timer jitter.
  const minGap = interval - 4;
  let last = Number.NEGATIVE_INFINITY;
  return (now) => {
    if (now - last < minGap) return false;
    last = now;
    return true;
  };
}
