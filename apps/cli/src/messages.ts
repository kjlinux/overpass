import en from "./locales/en.json" with { type: "json" };
import fr from "./locales/fr.json" with { type: "json" };
import type { RelayEvent } from "./relay.js";

export type Messages = typeof en;
export type Language = "fr" | "en";

export const messages: Record<Language, Messages> = { fr, en };

type Env = Record<string, string | undefined>;

/** OVERPASS_LANG wins, then the POSIX locale variables, then the system locale. */
export function detectLanguage(env: Env, systemLocale: string): Language {
  const candidates = [env.OVERPASS_LANG, env.LC_ALL, env.LC_MESSAGES, env.LANG, systemLocale];
  const first = candidates.find((value) => value !== undefined && value !== "") ?? "";
  return first.toLowerCase().startsWith("fr") ? "fr" : "en";
}

export function format(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => values[name] ?? match);
}

type Context = { forwardTo: string; time: string };

/** Turns what the relay did into one line for the terminal. */
export function describeEvent(text: Messages, event: RelayEvent, context: Context): string {
  switch (event.type) {
    case "ready":
      return format(text.ready, { ...event, forwardTo: context.forwardTo });
    case "reconnecting":
      return format(text.reconnecting, { seconds: Math.ceil(event.inMs / 1000).toString() });
    case "report_failed":
      return text.report_failed;
    case "unauthorized":
      return text.unauthorized;
    case "forwarded": {
      const { status, durationMs, error } = event.result;
      const base = { time: context.time, eventType: event.eventType };
      if (status === null)
        return format(text.forward_failed, {
          ...base,
          error: text.failures[error ?? "connection_failed"],
        });
      return format(text.forwarded, {
        ...base,
        status: status.toString(),
        duration: durationMs.toString(),
      });
    }
  }
}
