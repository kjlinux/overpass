const emDash = "\u2014";

/** Returns one error per line containing the em dash character. */
export function findEmDashes(file: string, content: string): string[] {
  return content
    .split("\n")
    .flatMap((line, index) =>
      line.includes(emDash) ? [`${file}:${String(index + 1)} contains an em dash`] : [],
    );
}
