function segments(path: string): string[] {
  const trimmed = path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
  return trimmed.split("/");
}

function decode(value: string): string | undefined {
  try {
    return decodeURIComponent(value);
  } catch {
    return undefined;
  }
}

/** Matches "/sessions/:id" style patterns; returns the decoded parameters or undefined. */
export function matchPath(pattern: string, path: string): Record<string, string> | undefined {
  const expected = segments(pattern);
  const actual = segments(path);
  if (expected.length !== actual.length) return undefined;
  const params: Record<string, string> = {};
  for (const [index, part] of expected.entries()) {
    const value = actual[index] ?? "";
    if (!part.startsWith(":")) {
      if (part !== value) return undefined;
      continue;
    }
    const decoded = value === "" ? undefined : decode(value);
    if (decoded === undefined) return undefined;
    params[part.slice(1)] = decoded;
  }
  return params;
}
