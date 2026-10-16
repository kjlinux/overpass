import { answerService } from "./service/answers.js";
import type { DiscussionsDeps } from "./service/context.js";
import { moderationService } from "./service/moderation.js";
import { threadService } from "./service/threads.js";

export type { DiscussionsDeps } from "./service/context.js";

/** Business rules of the discussions module, independent of HTTP and SQL. */
export function createDiscussionsService(deps: DiscussionsDeps) {
  return { ...threadService(deps), ...answerService(deps), ...moderationService(deps) };
}

export type DiscussionsService = ReturnType<typeof createDiscussionsService>;
