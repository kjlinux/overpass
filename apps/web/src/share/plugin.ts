import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { injectShareTags, shareMessagesSchema, shareShellFiles } from "@overpass/shared";
import type { ShareMessages } from "@overpass/shared";
import type { Plugin } from "vite";
import { injectPreloads, preloadLinks } from "./preload";
import type { Manifest } from "./preload";
import type { PublicPage } from "./publicPaths";
import { publicPages } from "./publicPaths";
import { shareTags } from "./shareTags";

type Options = { origin: string; languages: readonly string[] };

/** Reads and validates the share texts of one language, at build time. */
function messagesOf(root: string, language: string): ShareMessages {
  const file = join(root, "src/share/locales", `${language}.json`);
  return shareMessagesSchema.parse(JSON.parse(readFileSync(file, "utf8")));
}

/** The built index.html with the tags and the lang attribute of one page in one language. */
export function prerenderedHtml(
  template: string,
  input: Options & { language: string; page: PublicPage | undefined; messages: ShareMessages },
): string {
  const path = input.page === undefined ? "/" : publicPages[input.page];
  return injectShareTags(template, input.language, shareTags({ ...input, path }));
}

function write(file: string, content: string): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

/** Static pages per language, plus the shell and texts the API needs for content pages. */
function writePages(outDir: string, root: string, template: string, options: Options): void {
  const all: Record<string, ShareMessages> = {};
  const manifest = JSON.parse(
    readFileSync(join(outDir, ".vite/manifest.json"), "utf8"),
  ) as Manifest;
  for (const language of options.languages) {
    const messages = messagesOf(root, language);
    all[language] = messages;
    for (const [page, path] of Object.entries(publicPages) as [PublicPage, string][]) {
      const html = prerenderedHtml(template, { ...options, language, page, messages });
      const links = preloadLinks(manifest, language, page === "home");
      write(join(outDir, language, path, "index.html"), injectPreloads(html, links));
    }
  }
  write(join(outDir, shareShellFiles.shell), template);
  write(join(outDir, shareShellFiles.messages), JSON.stringify(all));
}

/** Injects site-wide share tags in dev and build, then pre-renders at the end of a build. */
export function sharePlugin(options: Options): Plugin {
  let template = "";
  let root = "";
  let outDir = "";
  let building = false;
  const fallback = options.languages[0] ?? "fr";
  return {
    name: "overpass-share-tags",
    configResolved: (config) => {
      root = config.root;
      outDir = resolve(config.root, config.build.outDir);
      building = config.command === "build";
    },
    transformIndexHtml: {
      order: "post",
      handler: (html) => {
        template = html;
        const messages = messagesOf(root, fallback);
        return prerenderedHtml(html, { ...options, language: fallback, page: undefined, messages });
      },
    },
    closeBundle: () => {
      if (building && template !== "") writePages(outDir, root, template, options);
    },
  };
}
