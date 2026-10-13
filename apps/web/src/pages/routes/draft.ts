import { routeCreateInput, routeTemplate } from "@overpass/shared";
import type { Language, RouteDetail } from "@overpass/shared";

export type Draft = {
  title: string;
  service: string;
  country: string;
  stack: string;
  language: Language;
  content: string;
};

/** The editor validates the fields it shows; translationOf travels outside the form. */
export const draftSchema = routeCreateInput.omit({ translationOf: true });

export function newDraft(language: Language): Draft {
  return {
    title: "",
    service: "",
    country: "",
    stack: "",
    language,
    content: routeTemplate(language),
  };
}

export function draftFrom(route: RouteDetail): Draft {
  return {
    title: route.title,
    service: route.service.slug,
    country: route.country,
    stack: route.stack,
    language: route.language,
    content: route.content,
  };
}

/** Only what changed, since every saved change creates a version. */
export function changesOf(initial: Draft, next: Draft): Partial<Omit<Draft, "language">> {
  const keys = ["title", "service", "country", "stack", "content"] as const;
  return Object.fromEntries(
    keys.filter((key) => next[key] !== initial[key]).map((key) => [key, next[key]]),
  );
}
