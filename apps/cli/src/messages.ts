import { readCatalogs } from "./catalogs.js";
import type { RelayEvent } from "./relay.js";
import type catalogue from "./locales/en.json";

export type Messages = typeof catalogue;

const fallback = "en";
const messages = readCatalogs<Messages>(new URL("./locales/", import.meta.url));

/** English is the fallback because it ships with every release. */
export function messagesFor(language: string): Messages {
  const found = messages[language] ?? messages[fallback];
  if (found === undefined) throw new Error(`missing ${fallback}.json catalogue`);
  return found;
}

type Env = Record<string, string | undefined>;

/** OVERPASS_LANG wins, then the POSIX locale variables, then the system locale. */
export function detectLanguage(
  env: Env,
  systemLocale: string,
  available: readonly string[] = Object.keys(messages),
): string {
  const candidates = [env.OVERPASS_LANG, env.LC_ALL, env.LC_MESSAGES, env.LANG, systemLocale];
  const first = candidates.find((value) => value !== undefined && value !== "") ?? "";
  const code = first.toLowerCase().split(/[-_.@]/)[0] ?? "";
  return available.includes(code) ? code : fallback;
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
