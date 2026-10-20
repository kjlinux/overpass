import type { ApiError, Envelope, Reply, ReplyPage, ThreadDetail } from "@overpass/shared";

/** The pages loaded after the thread's first one, and how to ask for the next. */
export type ReplyPagesView = {
  extra: Reply[];
  next: string | null;
  loading: boolean;
  error: ApiError | undefined;
  onMore: () => void;
};

export type FetchReplyPage = (cursor: string) => Promise<Envelope<ReplyPage>>;

export type Walked = {
  items: Reply[];
  next: string | null;
  pages: number;
  error: ApiError | undefined;
};

/** The first page then the loaded ones, each reply once; the accepted one is pinned apart. */
export function shownReplies(thread: ThreadDetail, extra: Reply[]): Reply[] {
  const seen = new Set<string>(thread.accepted === null ? [] : [thread.accepted.id]);
  return [...thread.items, ...extra].filter((reply) => {
    if (seen.has(reply.id)) return false;
    seen.add(reply.id);
    return true;
  });
}

/** Loads up to count pages from a cursor, so a reload brings back what the reader had opened. */
export async function walkPages(
  fetchPage: FetchReplyPage,
  cursor: string | null,
  count: number,
): Promise<Walked> {
  let walked: Walked = { items: [], next: cursor, pages: 0, error: undefined };
  while (walked.next !== null && walked.pages < count) {
    const { data, error } = await fetchPage(walked.next);
    if (error !== null) return { ...walked, error };
    walked = {
      items: [...walked.items, ...data.items],
      next: data.nextCursor,
      pages: walked.pages + 1,
      error: undefined,
    };
  }
  return walked;
}

/** Pages to fetch again after a reload: those opened, plus one still on its way. */
export function pagesToReload(at: { sameThread: boolean; opened: number; inFlight: number }) {
  return at.sameThread ? at.opened + at.inFlight : 0;
}
