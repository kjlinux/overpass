import { canRead } from "@overpass/shared";
import type { Reply, ReplyListQuery, ReplyPage } from "@overpass/shared";
import { decodeDateCursor, encodeDateCursor } from "../../../http/date-cursor.js";
import type { DateCursor } from "../../../http/date-cursor.js";
import type { ReplyRecord, ThreadRecord } from "../model.js";
import { isAdmin } from "./context.js";
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

export async function replyFacts(
  deps: DiscussionsDeps,
  records: ReplyRecord[],
  reader: Reader,
): Promise<ReplyFacts> {
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

/** One page of replies, oldest first; removed ones stay out unless a moderator reads. */
export async function replyWindow(
  deps: DiscussionsDeps,
  threadId: string,
  reader: Reader,
  page: { after?: DateCursor | undefined; limit: number },
): Promise<{ records: ReplyRecord[]; nextCursor: string | null }> {
  const window = { after: page.after, limit: page.limit, withRemoved: isAdmin(reader) };
  const rows = await deps.repository.repliesOf(threadId, window);
  const records = rows.slice(0, page.limit);
  const last = records[records.length - 1];
  const more = rows.length > page.limit && last !== undefined;
  return {
    records,
    nextCursor: more ? encodeDateCursor({ at: last.createdAt, id: last.id }) : null,
  };
}

/** The accepted reply, fetched apart so it shows whatever page it falls on. */
export async function acceptedRecord(
  deps: DiscussionsDeps,
  thread: ThreadRecord,
  reader: Reader,
): Promise<ReplyRecord | null> {
  if (thread.acceptedReplyId === null) return null;
  const record = await deps.repository.findReply(thread.acceptedReplyId);
  if (record === null || (record.status === "removed" && !isAdmin(reader))) return null;
  return record;
}

/** The page after a cursor, for the "load more" of a thread. */
export async function replyPage(
  deps: DiscussionsDeps,
  thread: ThreadRecord,
  reader: Reader,
  query: ReplyListQuery,
): Promise<ReplyPage> {
  const after = query.cursor === undefined ? undefined : decodeDateCursor(query.cursor);
  const { records, nextCursor } = await replyWindow(deps, thread.id, reader, {
    after,
    limit: query.limit,
  });
  const facts = await replyFacts(deps, records, reader);
  const items = records.map((record) => toReply(record, reader, facts, thread.acceptedReplyId));
  return { items, nextCursor };
}
