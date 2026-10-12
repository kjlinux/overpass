import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { checkBudget, homeAssets, homeBudget, homeRoots } from "./checks/bundle-budget.ts";
import type { Manifest } from "./checks/bundle-budget.ts";

const dist = "apps/web/dist";
const manifest = JSON.parse(readFileSync(join(dist, ".vite/manifest.json"), "utf8")) as Manifest;
const files = ["index.html", ...homeAssets(manifest, homeRoots)];
const sizes = Object.fromEntries(
  files.map((file) => [file, gzipSync(readFileSync(join(dist, file))).length]),
);

for (const [file, size] of Object.entries(sizes)) {
  console.log(`${(size / 1024).toFixed(1).padStart(7)} KB  ${file}`);
}
const errors = checkBudget(sizes, homeBudget);
for (const error of errors) console.error(error);
if (errors.length > 0) process.exitCode = 1;
else console.log("Home page within budget.");
