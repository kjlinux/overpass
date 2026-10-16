import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { routeRules } from "@overpass/shared";
import type { RouteState } from "@overpass/shared";
import { ApiCallError } from "../api/client.js";
import { freshnessOf } from "../freshness.js";
import type { Freshness } from "../freshness.js";
import { format } from "../messages.js";
import type { Messages } from "../messages.js";
import { dataBlock } from "../untrusted.js";
import type { ToolContext } from "./context.js";

type RouteFacts = { id: string; state: RouteState; lastCheckAt: string | null };

/** Adds the computed freshness so the assistant sees it next to the state. */
export function withFreshness<T extends RouteFacts>(
  route: T,
  now: Date,
): T & { freshness: Freshness } {
  return { ...route, freshness: freshnessOf(route, now) };
}

/** Only a re-serialised date reaches the trusted line, whatever the API sent. */
function normalisedDate(value: string | null): string | undefined {
  const time = value === null ? Number.NaN : Date.parse(value);
  return Number.isNaN(time) ? undefined : new Date(time).toISOString();
}

/** A trusted line, outside the data block: ids and computed facts only, no member text. */
export function statusLine(text: Messages, route: RouteFacts & { freshness: Freshness }): string {
  return format(text.status, {
    id: route.id,
    state: route.state,
    lastCheckAt: normalisedDate(route.lastCheckAt) ?? text.never,
    warning: format(text.freshness[route.freshness], { days: routeRules.freshnessDays }),
  });
}

export function dataResult(ctx: ToolContext, source: string, lines: string[], payload: unknown) {
  const header = lines.length === 0 ? "" : `${lines.join("\n")}\n\n`;
  return textResult(`${header}${dataBlock(source, payload, ctx.text.notice)}`);
}

function textResult(text: string, isError = false): CallToolResult {
  return { content: [{ type: "text", text }], ...(isError ? { isError } : {}) };
}

const plainCode = /^[a-z0-9_]{1,64}$/;

function errorText(text: Messages, code: string): string {
  if (!plainCode.test(code)) return text.errors.bad_response;
  if (code.endsWith("not_found")) return text.errors.not_found;
  if (Object.hasOwn(text.errors, code)) return text.errors[code as keyof Messages["errors"]];
  return format(text.errors.other, { code });
}

/** Checks the token first, then runs the tool; failures become tool errors, never exceptions. */
export async function guarded(
  ctx: ToolContext,
  run: () => Promise<CallToolResult>,
): Promise<CallToolResult> {
  try {
    await ctx.client.verifyToken();
    return await run();
  } catch (error) {
    const code = error instanceof ApiCallError ? error.code : "bad_response";
    return textResult(errorText(ctx.text, code), true);
  }
}

export function failure(text: Messages, code: keyof Messages["errors"]): CallToolResult {
  return textResult(text.errors[code], true);
}
