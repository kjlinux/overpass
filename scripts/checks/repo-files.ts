import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

const thirdPartyPrefixes = [".claude/skills/", ".references/"];

/** Lists tracked and untracked non-ignored files, minus third-party copies. */
export function listRepoFiles(): string[] {
  const output = execFileSync("git", ["ls-files", "-co", "--exclude-standard"], {
    encoding: "utf8",
  });
  return output
    .split("\n")
    .filter((file) => file.length > 0 && existsSync(file))
    .filter((file) => !thirdPartyPrefixes.some((prefix) => file.startsWith(prefix)));
}

export const codeExtensions = [".ts", ".tsx", ".js", ".mjs", ".cjs", ".css", ".html"];

/** Tells whether a path is source code subject to the shape rules. */
export function isCodeFile(file: string): boolean {
  return codeExtensions.some((extension) => file.endsWith(extension));
}
