import { readFileSync } from "node:fs";

/** Read from the shipped package.json, so the printed version can never drift from the published one. */
export function readVersion(manifest: URL): string {
  const { version } = JSON.parse(readFileSync(manifest, "utf8")) as { version: string };
  return version;
}
