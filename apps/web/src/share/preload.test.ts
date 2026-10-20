import { describe, expect, it } from "vitest";
import { injectPreloads, preloadLinks } from "./preload";
import type { Manifest } from "./preload";

const manifest: Manifest = {
  "index.html": { file: "assets/index.js", imports: ["_Layout.js"], isEntry: true },
  "_Layout.js": { file: "assets/Layout.js" },
  "_HomePage-x.js": {
    file: "assets/HomePage.js",
    name: "HomePage",
    isDynamicEntry: true,
    imports: ["_Layout.js", "_useLanguage.js"],
    css: ["assets/HomePage.css"],
  },
  "_useLanguage.js": { file: "assets/useLanguage.js" },
  "src/app/locales/en.json": { file: "assets/app-en.js" },
  "src/layout/locales/en.json": { file: "assets/layout-en.js" },
  "src/components/ui/locales/en.json": { file: "assets/ui-en.js" },
  "src/share/locales/en.json": { file: "assets/share-en.js" },
  "src/home/locales/en.json": { file: "assets/home-en.js" },
};
const shell =
  '<head><link rel="modulepreload" crossorigin href="/assets/Layout.js"><script type="module" src="/assets/index.js"></script></head>';

describe("preload links", () => {
  it("preloads the core translations of the page language only", () => {
    const links = preloadLinks(manifest, "en", false);
    expect(links).toContain('<link rel="modulepreload" crossorigin href="/assets/app-en.js">');
    expect(links.join("")).toContain("/assets/share-en.js");
    expect(links.join("")).not.toContain("HomePage");
  });

  it("adds the home chunk, its imports, its style and its texts on the home page", () => {
    const links = preloadLinks(manifest, "en", true).join("");
    expect(links).toContain("/assets/HomePage.js");
    expect(links).toContain("/assets/useLanguage.js");
    expect(links).toContain('<link rel="preload" as="style" href="/assets/HomePage.css">');
    expect(links).toContain("/assets/home-en.js");
  });

  it("injects the links before the end of head and skips files the shell already loads", () => {
    const html = injectPreloads(shell, preloadLinks(manifest, "en", true));
    expect(html.indexOf("app-en.js")).toBeLessThan(html.indexOf("</head>"));
    expect(html.match(/assets\/Layout\.js/g)).toHaveLength(1);
  });
});
