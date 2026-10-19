import type { Atomic } from "../../db/client.js";
import type {
  ContentKind,
  ContentStatus,
  Language,
  ThreadState,
  TopicSlug,
} from "@overpass/shared";
import type { DateCursor } from "../../http/date-cursor.js";
import type { replies, threads, topics } from "./tables.js";

export type TopicRecord = typeof topics.$inferSelect & { threads: number };
export type ThreadRecord = typeof threads.$inferSelect;
export type ThreadRow = ThreadRecord & { replies: number };
export type ReplyRecord = typeof replies.$inferSelect;

export type NewThread = Omit<ThreadRecord, "id" | "acceptedReplyId" | "status" | "topic"> & {
  topic: TopicSlug;
};
export type NewReply = { threadId: string; authorId: string; content: string; at: Date };

export type ThreadFilters = {
  topic?: TopicSlug | undefined;
  country?: string | undefined;
  stack?: string | undefined;
  language?: Language | undefined;
  route?: string | undefined;
  state?: ThreadState | undefined;
  after?: DateCursor | undefined;
  limit: number;
};

/** Storage port of the module; the service never sees SQL. */
export type DiscussionsRepository = {
  topics(): Promise<TopicRecord[]>;
  insertThread(thread: NewThread): Promise<ThreadRecord>;
  findThread(id: string): Promise<ThreadRow | null>;
  /** One page plus one row, so the caller knows whether another page exists. */
  listThreads(filters: ThreadFilters): Promise<ThreadRow[]>;
  /** Inserts the reply and marks the thread active, in one transaction. */
  insertReply(reply: NewReply): Promise<ReplyRecord>;
  findReply(id: string): Promise<ReplyRecord | null>;
  repliesOf(threadId: string): Promise<ReplyRecord[]>;
  votedBy(userId: string, replyIds: string[]): Promise<Set<string>>;
  /** The new useful count, or null when the account already voted. */
  insertVote(replyId: string, userId: string, at: Date): Promise<number | null>;
  setAccepted(threadId: string, replyId: string): Promise<void>;
  /** False when the account already has an open report on that content. */
  insertReport(kind: ContentKind, targetId: string, userId: string, at: Date): Promise<boolean>;
  openReports(kind: ContentKind, targetId: string): Promise<number>;
  reportedBy(userId: string, kind: ContentKind, ids: string[]): Promise<Set<string>>;
  setStatus(kind: ContentKind, id: string, status: ContentStatus): Promise<void>;
  resolveReports(kind: ContentKind, id: string, at: Date): Promise<void>;
  atomically: Atomic<DiscussionsRepository>;
};

export type RouteFacts = {
  id: string;
  title: string;
  country: string;
  service: { id: string; slug: string; name: string };
};

/** What this module needs to know about routes and services, provided by the routes module. */
export type RouteLookup = {
  facts(routeId: string): Promise<RouteFacts | null>;
  titles(routeIds: string[]): Promise<Map<string, string>>;
  services(serviceIds: string[]): Promise<Map<string, { slug: string; name: string }>>;
  /** The live route written from each thread, keyed by thread id. */
  fromThreads(threadIds: string[]): Promise<Map<string, string>>;
};
