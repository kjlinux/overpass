import type { ApiError, Reply, ReplyPage, ThreadDetail } from "@overpass/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "preact/hooks";
import { apiRequest } from "../../session";
import { pagesToReload, walkPages } from "./replyPages";
import type { FetchReplyPage, ReplyPagesView, Walked } from "./replyPages";

type State = {
  extra: Reply[];
  next: string | null;
  pages: number;
  loading: boolean;
  error: ApiError | undefined;
};

const fresh = (thread: ThreadDetail): State => ({
  extra: [],
  next: thread.nextCursor,
  pages: 0,
  loading: false,
  error: undefined,
});

const fetcherFor =
  (threadId: string): FetchReplyPage =>
  (cursor) =>
    apiRequest<ReplyPage>(
      "GET",
      `/v1/threads/${threadId}/replies?cursor=${encodeURIComponent(cursor)}`,
    );

const afterWalk = (from: State, walked: Walked): State => ({
  extra: [...from.extra, ...walked.items],
  next: walked.next,
  pages: from.pages + walked.pages,
  loading: false,
  error: walked.error,
});

/** Pages after the first; a reloaded thread walks them again so the reader keeps their place. */
export function useReplyPages(thread: ThreadDetail): ReplyPagesView {
  const [state, setState] = useState<State>(() => fresh(thread));
  const track = useRef({ latest: 0, opened: 0, inFlight: 0, threadId: thread.id });
  const fetchPage = useMemo(() => fetcherFor(thread.id), [thread.id]);
  const load = useCallback(
    async (from: State, count: number, asked = 0) => {
      const request = ++track.current.latest;
      track.current.inFlight = asked;
      // What is on screen stays while loading, so the focused reply is never unmounted.
      setState((shown) => ({ ...shown, loading: true, error: undefined }));
      const walked = await walkPages(fetchPage, from.next, count);
      // A walk started before a reload must not overwrite the newer one.
      if (request !== track.current.latest) return;
      const after = afterWalk(from, walked);
      track.current = { ...track.current, inFlight: 0, opened: after.pages };
      setState(after);
    },
    [fetchPage],
  );
  useEffect(() => {
    const { latest, opened, inFlight, threadId } = track.current;
    const count = pagesToReload({ sameThread: threadId === thread.id, opened, inFlight });
    track.current = { latest: latest + 1, opened: 0, inFlight: 0, threadId: thread.id };
    if (count === 0) setState(fresh(thread));
    else void load(fresh(thread), count);
  }, [thread, load]);
  return {
    extra: state.extra,
    next: state.next,
    loading: state.loading,
    error: state.error,
    onMore: () => {
      if (state.next !== null && !state.loading) void load(state, 1, 1);
    },
  };
}
