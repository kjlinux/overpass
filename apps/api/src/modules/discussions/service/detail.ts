import { canRead, transformEligibility } from "@overpass/shared";
import type { Reply, ThreadDetail } from "@overpass/shared";
import type { ReplyRecord, ThreadRow } from "../model.js";
import { isAdmin, stateOf, summaries } from "./context.js";
import type { DiscussionsDeps, Reader } from "./context.js";

type ReplyFacts = { names: Map<string, string>; voted: Set<string>; reported: Set<string> };

export function toReply(
  record: ReplyRecord,
  reader: Reader,
  facts: ReplyFacts,
  acceptedId: string | null,
): Reply {
  const isAuthor = reader !== null && record.authorId === reader.id;
  const readable = canRead(record.status, { isAuthor, isAdmin: isAdmin(reader) });
  return {
    id: record.id,
    author: facts.names.get(record.authorId ?? "") ?? "",
    content: readable ? record.content : null,
    status: record.status,
    useful: record.usefulCount,
    accepted: record.id === acceptedId,
    createdAt: record.createdAt.toISOString(),
    viewer: {
      isAuthor,
      voted: facts.voted.has(record.id),
      reported: facts.reported.has(record.id),
    },
  };
}

async function replyFacts(deps: DiscussionsDeps, records: ReplyRecord[], reader: Reader) {
  const ids = records.map((record) => record.id);
  const authors = records.flatMap((record) => (record.authorId === null ? [] : [record.authorId]));
  const none = Promise.resolve(new Set<string>());
  const [names, voted, reported] = await Promise.all([
    deps.handles(authors),
    reader === null ? none : deps.repository.votedBy(reader.id, ids),
    reader === null ? none : deps.repository.reportedBy(reader.id, "reply", ids),
  ]);
  return { names, voted, reported };
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
  const records = (await deps.repository.repliesOf(thread.id)).filter(
    (record) => record.status !== "removed" || admin,
  );
  const [[summary], facts, transformed, reported] = await Promise.all([
    summaries(deps, [thread]),
    replyFacts(deps, records, reader),
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
    items: records.map((record) => toReply(record, reader, facts, thread.acceptedReplyId)),
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
