import { fieldErrors, routeModerationInput, suspensionInput } from "@overpass/shared";
import type { QueueItem, QueueKind, QueueState } from "@overpass/shared";

export type Decision = "hide" | "restore" | "remove" | "block" | "suspendBlog";

/** Decisions that take content away from readers ask for a danger confirmation. */
export const destructiveDecisions: readonly Decision[] = ["hide", "remove", "block", "suspendBlog"];

function blogDecisions(item: QueueItem): Decision[] {
  const visible = item.status === "visible";
  const own: Decision[] = visible ? ["hide", "block"] : ["block", "restore"];
  return item.author === "" ? own : [...own, "suspendBlog"];
}

/** Mirrors what each module accepts: itineraries, discussions and the blog decide differently. */
export function decisionsFor(item: QueueItem): Decision[] {
  switch (item.kind) {
    case "route":
      return item.status === "visible" ? ["hide", "restore"] : ["restore"];
    case "thread":
    case "reply":
      return ["restore", "remove"];
    case "post":
    case "comment":
      return blogDecisions(item);
  }
}

/** Only the itinerary decision records a reason; the older routes refuse unknown fields. */
export const takesReason = (item: QueueItem): boolean => item.kind === "route";

export type DecisionRequest = { path: string; body: Record<string, unknown> };

export function decisionRequest(
  item: QueueItem,
  decision: Decision,
  reason: string,
): DecisionRequest {
  if (decision === "suspendBlog") {
    const path = `/v1/moderation/blogs/${encodeURIComponent(item.author)}/suspension`;
    return { path, body: { suspended: true } };
  }
  if (item.kind === "route") {
    const trimmed = reason.trim();
    const body = trimmed === "" ? { decision } : { decision, reason: trimmed };
    return { path: `/v1/admin/routes/${item.id}/moderation`, body };
  }
  if (item.kind === "thread" || item.kind === "reply") {
    return { path: `/v1/moderation/${item.kind}/${item.id}`, body: { decision } };
  }
  return { path: `/v1/moderation/blog/${item.kind}/${item.id}`, body: { action: decision } };
}

/** A decision moves content to the other list or settles it; only a blog suspension leaves it. */
export function afterDecision(items: QueueItem[], item: QueueItem, decision: Decision) {
  if (decision === "suspendBlog") return items;
  return items.filter((other) => other.kind !== item.kind || other.id !== item.id);
}

export const queuePath = (kind: QueueKind, state: QueueState): string =>
  `/v1/admin/queue?kind=${kind}&state=${state}`;

/** The same schemas as the API, so the dialog refuses what the server would refuse. */
export function reasonError(rule: "optional" | "required", reason: string): string | undefined {
  const result =
    rule === "required"
      ? suspensionInput.safeParse({ reason })
      : routeModerationInput.safeParse({ decision: "hide", reason });
  return result.success ? undefined : fieldErrors(result.error)["reason"];
}
