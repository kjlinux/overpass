export type ShareTag =
  | { kind: "title"; content: string }
  | { kind: "meta"; attribute: "name" | "property"; key: string; content: string }
  | { kind: "link"; rel: string; href: string; hreflang?: string };

export type ShareAlternate = { language: string; url: string };

/** One shared page: alternates list every language the content exists in, default first. */
export type ShareDocument = {
  title: string;
  description: string;
  url: string;
  type: "website" | "article";
  language: string;
  origin: string;
  siteName: string;
  alternates: ShareAlternate[];
};

export const shareImageSize = { width: 1200, height: 630 } as const;

/** The site share image of a language, committed under apps/web/public/share. */
export function shareImagePath(language: string): string {
  return `/share/overpass-${language}.png`;
}

const ogLocales: Record<string, string> = { fr: "fr_FR", en: "en_US" };

/** Open Graph wants a territory; an unknown language falls back to its bare code. */
export function ogLocaleOf(language: string): string {
  return ogLocales[language] ?? language;
}

const meta = (attribute: "name" | "property", key: string, content: string): ShareTag => ({
  kind: "meta",
  attribute,
  key,
  content,
});

function languageLinks(doc: ShareDocument): ShareTag[] {
  const [first] = doc.alternates;
  if (first === undefined) return [];
  const links = doc.alternates.map((other): ShareTag => {
    return { kind: "link", rel: "alternate", hreflang: other.language, href: other.url };
  });
  return [...links, { kind: "link", rel: "alternate", hreflang: "x-default", href: first.url }];
}

/** Every tag a link preview, a search engine or a social card reads. */
export function buildShareTags(doc: ShareDocument): ShareTag[] {
  const image = `${doc.origin}${shareImagePath(doc.language)}`;
  const others = doc.alternates.filter((other) => other.language !== doc.language);
  return [
    { kind: "title", content: doc.title },
    meta("name", "description", doc.description),
    { kind: "link", rel: "canonical", href: doc.url },
    ...languageLinks(doc),
    meta("property", "og:type", doc.type),
    meta("property", "og:site_name", doc.siteName),
    meta("property", "og:title", doc.title),
    meta("property", "og:description", doc.description),
    meta("property", "og:url", doc.url),
    meta("property", "og:image", image),
    meta("property", "og:image:width", String(shareImageSize.width)),
    meta("property", "og:image:height", String(shareImageSize.height)),
    meta("property", "og:locale", ogLocaleOf(doc.language)),
    ...others.map((other) => meta("property", "og:locale:alternate", ogLocaleOf(other.language))),
    meta("name", "twitter:card", "summary_large_image"),
    meta("name", "twitter:title", doc.title),
    meta("name", "twitter:description", doc.description),
    meta("name", "twitter:image", image),
  ];
}

const escapes: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Escapes text for an HTML attribute or element body. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => escapes[character] ?? character);
}

/** Serialises the tags; data-share marks the ones the client replaces on navigation. */
export function renderShareTags(tags: ShareTag[]): string {
  return tags
    .map((tag) => {
      if (tag.kind === "title") return `<title>${escapeHtml(tag.content)}</title>`;
      if (tag.kind === "meta") {
        const content = escapeHtml(tag.content);
        return `<meta data-share ${tag.attribute}="${tag.key}" content="${content}" />`;
      }
      const lang = tag.hreflang === undefined ? "" : ` hreflang="${escapeHtml(tag.hreflang)}"`;
      return `<link data-share rel="${tag.rel}"${lang} href="${escapeHtml(tag.href)}" />`;
    })
    .join("\n    ");
}

/** Marks where the tags go in apps/web/index.html and in the shell the API serves. */
export const shareTagsPlaceholder = "<!--share-tags-->";

/** Files the web build writes for the API: the page shell and the share texts per language. */
export const shareShellFiles = { shell: "share/shell.html", messages: "share/messages.json" };

/** Puts rendered tags and the page language into the shell; the replacement is taken literally. */
export function injectShareTags(shell: string, language: string, tags: ShareTag[]): string {
  const rendered = renderShareTags(tags);
  return shell
    .replace(shareTagsPlaceholder, () => rendered)
    .replace(/<html lang="[^"]*"/, () => `<html lang="${escapeHtml(language)}"`);
}
