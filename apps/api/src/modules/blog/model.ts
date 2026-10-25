import type { Atomic } from "../../db/client.js";
import type {
  BlogContentKind,
  Language,
  ModerationStatus,
  PostCategory,
  PostKind,
  PostStatus,
} from "@overpass/shared";
import type { DateCursor } from "../../http/date-cursor.js";

export type PostRow = {
  id: string;
  kind: PostKind;
  authorId: string | null;
  authorHandle: string | null;
  authorCountry: string | null;
  language: Language;
  translationGroup: string;
  slug: string;
  category: PostCategory;
  title: string;
  summary: string;
  content: string;
  coverMediaId: string | null;
  status: PostStatus;
  moderation: ModerationStatus;
  publishedAt: Date | null;
  starCount: number;
  commentCount: number;
  updatedAt: Date;
  suspended: boolean;
  translation: { language: Language; slug: string } | null;
};

export type NewPost = {
  kind: PostKind;
  authorId: string;
  language: Language;
  translationGroup?: string | undefined;
  baseSlug: string;
  category: PostCategory;
  title: string;
  summary: string;
  content: string;
  coverMediaId?: string | null | undefined;
  status: PostStatus;
  publishedAt: Date | null;
  at: Date;
};

type Editable =
  "category" | "title" | "summary" | "content" | "coverMediaId" | "status" | "publishedAt";
export type PostPatch = { [Key in Editable]?: PostRow[Key] | undefined };

export type FeedFilters = {
  category?: PostCategory | undefined;
  language?: Language | undefined;
  authorId?: string | undefined;
  newsOnly?: boolean;
  now: Date;
  limit: number;
};

/** Tier 0 holds followed authors, tier 1 the recent posts ranked by stars. */
export type FeedCursor = { tier: 0 | 1; stars: number; at: Date; id: string };
export type FeedRow = PostRow & { tier: 0 | 1 };

export type CommentRow = {
  id: string;
  postId: string;
  authorId: string;
  authorHandle: string | null;
  content: string;
  moderation: ModerationStatus;
  createdAt: Date;
};

export type Member = { id: string; handle: string; country: string };

export type PostsPart = {
  insertPost(post: NewPost): Promise<string>;
  updatePost(id: string, patch: PostPatch, at: Date): Promise<void>;
  findPost(id: string): Promise<PostRow | null>;
  /** The post in the asked language first, then in any other language. */
  findBySlug(slug: string, language: Language): Promise<PostRow | null>;
  postsOf(authorId: string, limit: number): Promise<PostRow[]>;
  memberByHandle(handle: string): Promise<Member | null>;
  isSuspended(userId: string): Promise<boolean>;
};

export type FeedPart = {
  recent(filters: FeedFilters, after?: DateCursor): Promise<PostRow[]>;
  forMe(filters: FeedFilters, viewerId: string | null, after?: FeedCursor): Promise<FeedRow[]>;
  related(post: PostRow, now: Date, limit: number): Promise<PostRow[]>;
};

export type SocialPart = {
  /** The new star count, or null when nothing changed. */
  addStar(postId: string, userId: string, at: Date): Promise<number | null>;
  removeStar(postId: string, userId: string): Promise<number | null>;
  hasStarred(postId: string, userId: string): Promise<boolean>;
  insertComment(postId: string, authorId: string, content: string, at: Date): Promise<CommentRow>;
  findComment(id: string): Promise<CommentRow | null>;
  comments(postId: string, after: DateCursor | undefined, limit: number): Promise<CommentRow[]>;
  follow(followerId: string, followeeId: string, at: Date): Promise<void>;
  unfollow(followerId: string, followeeId: string): Promise<void>;
  isFollowing(followerId: string, followeeId: string): Promise<boolean>;
  followers(userId: string): Promise<number>;
  following(followerId: string): Promise<(Member & { followedAt: Date })[]>;
};

export type ModerationPart = {
  /** Inserts the report under a row lock and returns the open reporters, or null if a duplicate. */
  report(kind: BlogContentKind, id: string, userId: string, at: Date): Promise<string[] | null>;
  reportedBy(userId: string, kind: BlogContentKind, ids: string[]): Promise<Set<string>>;
  setModeration(kind: BlogContentKind, id: string, status: ModerationStatus): Promise<void>;
  resolveReports(kind: BlogContentKind, id: string, at: Date): Promise<void>;
  setSuspended(userId: string, by: string, suspended: boolean, at: Date): Promise<void>;
};

/** Storage port of the module; the service never sees SQL. */
export type BlogRepository = PostsPart &
  FeedPart &
  SocialPart &
  ModerationPart & { atomically: Atomic<BlogRepository> };
