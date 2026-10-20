import { canRead, pageSizeMax, transformEligibility } from "@overpass/shared";
import type { ThreadDetail } from "@overpass/shared";
import type { ThreadRow } from "../model.js";
import { isAdmin, stateOf, summaries } from "./context.js";
import type { DiscussionsDeps, Reader } from "./context.js";
import { acceptedRecord, replyFacts, replyWindow, toReply } from "./replies.js";

/** The first page of replies and the accepted one, with the facts the reader needs on both. */
async function firstReplies(deps: DiscussionsDeps, thread: ThreadRow, reader: Reader) {
  const [{ records, nextCursor }, accepted, listed] = await Promise.all([
    replyWindow(deps, thread.id, reader, { limit: pageSizeMax }),
    acceptedRecord(deps, thread, reader),
    deps.repository.countRepliesOf(thread.id, isAdmin(reader)),
  ]);
  const facts = await replyFacts(
    deps,
    accepted === null ? records : [...records, accepted],
    reader,
  );
  const shape = (record: (typeof records)[number]) =>
    toReply(record, reader, facts, thread.acceptedReplyId);
  return {
    items: records.map(shape),
    listed,
    nextCursor,
    accepted: accepted === null ? null : shape(accepted),
  };
}

/** The thread as one reader may see it: hidden text is blanked, removed replies are dropped. */
export async function threadDetail(
  deps: DiscussionsDeps,
  thread: ThreadRow,
  reader: Reader,
): Promise<ThreadDetail> {
  const isAuthor = reader !== null && thread.authorId === reader.id;
  const admin = isAdmin(reader);
  const readable = canRead(thread.status, { isAuthor, isAdmin: admin });
  const [[summary], replies, transformed, reported] = await Promise.all([
    summaries(deps, [thread]),
    firstReplies(deps, thread, reader),
    deps.routes.fromThreads([thread.id]),
    reader === null
      ? new Set<string>()
      : deps.repository.reportedBy(reader.id, "thread", [thread.id]),
  ]);
  if (summary === undefined) throw new Error("thread summary missing");
  const transformedRoute = transformed.get(thread.id) ?? null;
  return {
    ...summary,
    content: readable ? thread.content : null,
    errorText: readable ? thread.errorText : null,
    codeText: readable ? thread.codeText : null,
    acceptedReplyId: thread.acceptedReplyId,
    transformedRoute,
    ...replies,
    viewer: {
      isAuthor,
      isAdmin: admin,
      reported: reported.has(thread.id),
      canTransform: canTransform(thread, isAuthor, transformedRoute),
    },
  };
}

function canTransform(thread: ThreadRow, isAuthor: boolean, route: string | null): boolean {
  const facts = { isThreadAuthor: isAuthor, alreadyTransformed: route !== null };
  return transformEligibility({ ...facts, resolved: stateOf(thread) === "resolved" }) === "allowed";
}
