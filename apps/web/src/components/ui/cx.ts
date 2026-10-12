/** Joins class names, skipping false, null and undefined. */
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter((part): part is string => typeof part === "string" && part !== "").join(" ");
}

export function classOf(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
