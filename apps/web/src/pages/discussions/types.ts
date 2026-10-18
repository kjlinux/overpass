export type Topic = {
  id: string;
  name: string;
  description: string;
  sortOrder: number;
};

export type ThreadAuthor = {
  id: string | null;
  handle: string;
};

export type ThreadSummary = {
  id: string;
  topicId: string;
  title: string;
  language: string;
  country: string | null;
  stack: string | null;
  routeId: string | null;
  acceptedReplyId: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  author: ThreadAuthor;
  repliesCount: number;
};

export type ReplyItem = {
  id: string;
  threadId: string;
  content: string;
  usefulVotes: number;
  status: string;
  createdAt: string;
  author: ThreadAuthor;
};

export type ThreadDetail = ThreadSummary & {
  content: string;
  replies: ReplyItem[];
};

export type DiscussionsFilterState = {
  topicId: string;
  country: string;
  stack: string;
};
