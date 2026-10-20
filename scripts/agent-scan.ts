import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const scanner = "ecc-agentshield@1.6.0";
const excluded = new Set(["package-lock.json"]);

/** Files of the project: tracked or new, never git-ignored ones such as .references/. */
function projectFiles(): string[] {
  const listing = spawnSync(
    "git",
    ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
    {
      encoding: "utf8",
    },
  );
  if (listing.status !== 0) throw new Error(listing.stderr);
  // A tracked file deleted in the working tree is skipped, as the repository checks do.
  return listing.stdout
    .split("\0")
    .filter((file) => file !== "" && !excluded.has(file) && existsSync(file));
}

/** Copies the project into a scratch folder, so the scanner never sees what it must skip. */
function stage(files: string[]): string {
  const root = mkdtempSync(join(tmpdir(), "agent-scan-"));
  for (const file of files) {
    cpSync(file, join(root, file), { force: true });
  }
  return root;
}

const root = stage(projectFiles());
try {
  const args = ["--yes", scanner, "scan", "--path", root, ...process.argv.slice(2)];
  const run = spawnSync("npx", args, { stdio: "inherit", shell: process.platform === "win32" });
  process.exitCode = run.status ?? 1;
} finally {
  rmSync(root, { recursive: true, force: true });
}
