import type { PostPage } from "@overpass/shared";
import { useEffect, useState } from "preact/hooks";
import { apiRequest } from "../../session";
import { useApi } from "../routes";

/** Keeps every loaded page, so "show more" appends instead of replacing. */
export function useFeed(path: (cursor?: string) => string) {
  const first = path();
  const { state, reload } = useApi<PostPage>(first);
  const [extra, setExtra] = useState<PostPage | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  useEffect(() => {
    setExtra(null);
  }, [first]);
  const page = state.status === "ready" ? (extra ?? state.data) : null;
  const more = async () => {
    if (page?.nextCursor == null) return;
    setLoadingMore(true);
    const next = await apiRequest<PostPage>("GET", path(page.nextCursor));
    setLoadingMore(false);
    if (next.error === null) {
      setExtra({ items: [...page.items, ...next.data.items], nextCursor: next.data.nextCursor });
    }
  };
  return { state, reload, page, more, loadingMore };
}
