import type { ApiClient } from "../api/client.js";
import type { Messages } from "../messages.js";

export type ToolContext = { client: ApiClient; text: Messages; now: () => Date };

/** Every tool only reads; none reaches outside Overpass. */
export const readOnly = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;
