export const adminPageSize = 50;

export const queueKinds = ["route", "thread", "reply", "post", "comment"] as const;
export type QueueKind = (typeof queueKinds)[number];

/** "open": visible content with at least one report; "hidden": hidden by moderation. */
export const queueStates = ["open", "hidden"] as const;
export type QueueState = (typeof queueStates)[number];

export const routeModerations = ["visible", "hidden"] as const;
export type RouteModeration = (typeof routeModerations)[number];

export const routeDecisions = ["hide", "restore"] as const;
export type RouteDecision = (typeof routeDecisions)[number];

/** Everything a decision can target; "blog" is a member's whole blog. */
export const logTargetKinds = [...queueKinds, "account", "proposal", "blog"] as const;
export type LogTargetKind = (typeof logTargetKinds)[number];

export const logActions = [
  "hide",
  "block",
  "remove",
  "restore",
  "suspend",
  "reactivate",
  "accept",
  "reject",
] as const;
export type LogAction = (typeof logActions)[number];
