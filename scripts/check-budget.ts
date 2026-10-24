import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import {
  checkBudget,
  homeAssets,
  homeBudget,
  homeLazyRoots,
  homeLoadAssets,
  homeRoots,
} from "./checks/bundle-budget.ts";
import type { Manifest } from "./checks/bundle-budget.ts";

const dist = "apps/web/dist";
const manifest = JSON.parse(readFileSync(join(dist, ".vite/manifest.json"), "utf8")) as Manifest;
const gzipOf = (file: string): number => gzipSync(readFileSync(join(dist, file))).length;
const sizesOf = (files: string[]): Record<string, number> =>
  Object.fromEntries(files.map((file) => [file, gzipOf(file)]));
// A desktop visitor at 1x in the light theme loads the 760 px column captures.
const imageDir = join(dist, "home");
const homeImages = (existsSync(imageDir) ? readdirSync(imageDir) : [])
  .filter((name) => name.endsWith("-760.webp") && !name.includes("-dark"))
  .map((name) => `home/${name}`);

// The share plugin pre-renders dist/fr/index.html for the home page; plain builds only have index.html.
const homeHtml = existsSync(join(dist, "fr/index.html")) ? "fr/index.html" : "index.html";
const firstLoad = [homeHtml, ...homeAssets(manifest, homeRoots)];
const lazy = homeLoadAssets(manifest, homeLazyRoots, []);
const everything = sizesOf([...new Set([...firstLoad, ...lazy, ...homeImages])]);

const print = (title: string, sizes: Record<string, number>): void => {
  console.log(title);
  for (const [file, size] of Object.entries(sizes)) {
    console.log(`${(size / 1024).toFixed(1).padStart(7)} KB  ${file}`);
  }
};
print("Home page, first load, lazy chunks and images:", everything);
const kb = (sizes: Record<string, number>, keep: (file: string) => boolean): string =>
  `${(Object.entries(sizes).reduce((sum, [file, n]) => sum + (keep(file) ? n : 0), 0) / 1024).toFixed(1)} KB`;
console.log(`First load JS ${kb(sizesOf(firstLoad), (file) => file.endsWith(".js"))}`);
console.log(`Home in all ${kb(everything, () => true)}`);

const errors = [
  ...checkBudget(sizesOf(firstLoad), { ...homeBudget, totalGzipBytes: Infinity }),
  ...checkBudget(everything, { ...homeBudget, jsGzipBytes: Infinity }),
];
for (const error of errors) console.error(error);
if (errors.length > 0) process.exitCode = 1;
else console.log("Home page within budget.");
