import { shareMessagesSchema, supportedLanguages } from "@overpass/shared";
import type { Language, ShareTag } from "@overpass/shared";
import i18next from "i18next";
import { useEffect } from "preact/hooks";
import { useLocation } from "preact-iso";
import { pathWithoutLanguage } from "../layout";
import { pageOfPath } from "./publicPaths";
import { shareTags } from "./shareTags";

/** Swaps the head tags marked data-share for a new set, and the document title. */
export function applyShareTags(doc: Document, tags: ShareTag[]): void {
  for (const element of doc.head.querySelectorAll("[data-share]")) element.remove();
  for (const tag of tags) {
    if (tag.kind === "title") {
      doc.title = tag.content;
      continue;
    }
    const element = doc.createElement(tag.kind);
    element.setAttribute("data-share", "");
    if (tag.kind === "meta") {
      element.setAttribute(tag.attribute, tag.key);
      element.setAttribute("content", tag.content);
    } else {
      element.setAttribute("rel", tag.rel);
      if (tag.hreflang !== undefined) element.setAttribute("hreflang", tag.hreflang);
      element.setAttribute("href", tag.href);
    }
    doc.head.append(element);
  }
}

/** Keeps the title and share tags in step with client-side navigation. */
export function useShareTags(language: Language | undefined): void {
  const { path } = useLocation();
  useEffect(() => {
    if (language === undefined) return;
    let current = true;
    void i18next.loadNamespaces("share").then(() => {
      const parsed = shareMessagesSchema.safeParse(i18next.getResourceBundle(language, "share"));
      if (!current || !parsed.success) return;
      const rest = pathWithoutLanguage(path);
      const input = { origin: location.origin, path: rest, language, page: pageOfPath(rest) };
      applyShareTags(
        document,
        shareTags({ ...input, languages: supportedLanguages, messages: parsed.data }),
      );
    });
    return () => {
      current = false;
    };
  }, [language, path]);
}
