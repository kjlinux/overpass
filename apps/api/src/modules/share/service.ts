import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildShareTags,
  injectShareTags,
  plainSummary,
  shareMessagesSchema,
  shareShellFiles,
  supportedLanguages,
} from "@overpass/shared";
import type { ShareMessages } from "@overpass/shared";
import { z } from "zod";
import type { ContentVersion, ShareRepository, SharedContent } from "./repository.js";
import { isUuid } from "./schemas.js";

/** The page shell and share texts written by the web build into WEB_DIST_DIR. */
export type ShellFiles = { shell: string; messages: Record<string, ShareMessages> };

/** Reads the build output once at start-up; a missing or malformed file stops the API. */
export function loadShellFiles(distDir: string): ShellFiles {
  const shell = readFileSync(join(distDir, shareShellFiles.shell), "utf8");
  const raw: unknown = JSON.parse(readFileSync(join(distDir, shareShellFiles.messages), "utf8"));
  return { shell, messages: z.record(z.string(), shareMessagesSchema).parse(raw) };
}

type Deps = {
  repository: ShareRepository;
  files: ShellFiles;
  origin: string;
  now: () => Date;
  onError: (error: unknown) => void;
};

type Kind = { section: "routes" | "blog"; find: () => Promise<SharedContent | null> };

const languageOrder = (version: ContentVersion) =>
  supportedLanguages.findIndex((language) => language === version.language);

type Request = { language: string; section: string; segment: string };

const urlOf = (origin: string, language: string, section: string, segment: string) =>
  `${origin}/${language}/${section}/${encodeURIComponent(segment)}`;

/** The shell with the content's tags, or the site-wide ones when nothing public was found. */
function render(files: ShellFiles, origin: string, request: Request, found: SharedContent | null) {
  const { language, section, segment } = request;
  const messages = files.messages[language];
  if (messages === undefined) throw new Error(`No share texts for ${language}`);
  const site = messages.site;
  const description = found === null ? "" : plainSummary(found.text);
  const versions = [...(found?.versions ?? [])].sort((a, b) => languageOrder(a) - languageOrder(b));
  const tags = buildShareTags({
    title: found?.title ?? site.title,
    description: description === "" ? site.description : description,
    url: urlOf(origin, language, section, segment),
    type: found === null ? "website" : "article",
    language,
    origin,
    siteName: site.name,
    alternates: versions.map((v) => ({
      language: v.language,
      url: urlOf(origin, v.language, section, v.segment),
    })),
  });
  return injectShareTags(files.shell, language, tags);
}

export function createShareService(deps: Deps) {
  const { files, origin } = deps;

  /** Any failure falls back to the generic shell: a preview must never break the page. */
  async function page(language: string, segment: string, kind: Kind): Promise<string> {
    const request = { language, section: kind.section, segment };
    try {
      return render(files, origin, request, await kind.find());
    } catch (error) {
      deps.onError(error);
      return render(files, origin, request, null);
    }
  }

  return {
    routePage: (language: string, id: string) =>
      page(language, id, {
        section: "routes",
        find: async () => (isUuid(id) ? deps.repository.route(id) : null),
      }),
    postPage: (language: string, slug: string) =>
      page(language, slug, {
        section: "blog",
        find: () => deps.repository.post(language, slug, deps.now()),
      }),
  };
}

export type ShareService = ReturnType<typeof createShareService>;
