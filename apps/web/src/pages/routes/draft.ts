import { routeCreateInput, routeTemplate } from "@overpass/shared";
import type { Language, RouteDetail, ThreadDetail } from "@overpass/shared";

export type Draft = {
  title: string;
  service: string;
  country: string;
  stack: string;
  language: Language;
  content: string;
};

/** The editor validates the fields it shows; the source route or thread travels outside it. */
export const draftSchema = routeCreateInput.omit({ translationOf: true, sourceThread: true });

/** A fence longer than any backtick run in the code, so the block never closes early. */
function fenced(code: string): string {
  const longest = Math.max(0, ...(code.match(/`+/g) ?? []).map((run) => run.length));
  const fence = "`".repeat(Math.max(3, longest + 1));
  return `${fence}\n${code}\n${fence}`;
}

/** A route seeded by a resolved thread: its question, its code, then the accepted reply. */
export function threadDraft(thread: ThreadDetail): Draft {
  const accepted = thread.accepted?.content ?? null;
  const code = thread.codeText === null ? null : fenced(thread.codeText);
  const parts = [thread.content, code, accepted].filter((part): part is string => part !== null);
  return {
    title: thread.title,
    service: thread.service?.slug ?? "",
    country: thread.country ?? "",
    stack: thread.stack ?? "",
    language: thread.language,
    content: parts.join("\n\n---\n\n"),
  };
}

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
