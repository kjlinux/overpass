import { buildShareTags, pageTitle } from "@overpass/shared";
import type { ShareMessages, ShareTag, ShareText } from "@overpass/shared";
import type { PublicPage } from "./publicPaths";

export type ShareInput = {
  origin: string;
  path: string;
  language: string;
  languages: readonly string[];
  messages: ShareMessages;
  page: PublicPage | undefined;
};

/** Absolute URL of a page; the home page keeps its trailing slash, like its folder. */
export function pageUrl(origin: string, language: string, path: string): string {
  return `${origin}/${language}${path === "/" ? "/" : path}`;
}

/** Title and description of a page; dynamic or unknown pages get the site-wide texts. */
export function shareTextOf(messages: ShareMessages, page: PublicPage | undefined): ShareText {
  const entry = page === undefined || page === "home" ? undefined : messages.pages[page];
  if (entry === undefined) {
    return { title: messages.site.title, description: messages.site.description };
  }
  return { title: pageTitle(messages, entry.title), description: entry.description };
}

/** Every share tag of one static page in one language, through the shared builder. */
export function shareTags(input: ShareInput): ShareTag[] {
  const { origin, path, language, languages, messages } = input;
  return buildShareTags({
    ...shareTextOf(messages, input.page),
    url: pageUrl(origin, language, path),
    type: "website",
    language,
    origin,
    siteName: messages.site.name,
    alternates: languages.map((other) => ({
      language: other,
      url: pageUrl(origin, other, path),
    })),
  });
}
