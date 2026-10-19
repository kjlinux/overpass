import { useCallback, useEffect, useReducer, useRef } from "preact/hooks";
import { apiRequest } from "../../session";
import type { Page, Paged, PagedAction } from "./paging";
import { initialPaged, pagedReducer, withCursor } from "./paging";

type Reducer<Item> = (state: Paged<Item>, action: PagedAction<Item>) => Paged<Item>;

/** Loads the first page whenever the path changes, then the next ones on demand. */
export function usePaged<Item>(path: string) {
  const [state, dispatch] = useReducer<Paged<Item>, PagedAction<Item>>(
    pagedReducer as Reducer<Item>,
    initialPaged<Item>(),
  );
  const latest = useRef(0);
  const load = useCallback(
    async (cursor: string | undefined) => {
      const request = ++latest.current;
      dispatch(cursor === undefined ? { type: "start" } : { type: "more" });
      const { data, error } = await apiRequest<Page<Item>>("GET", withCursor(path, cursor));
      // An answer for a previous filter must not land in the new list.
      if (request !== latest.current) return;
      if (error === null) dispatch({ type: "page", page: data, append: cursor !== undefined });
      else dispatch({ type: "fail", error });
    },
    [path],
  );
  useEffect(() => {
    void load(undefined);
  }, [load]);
  return {
    state,
    more: () => {
      if (state.next !== null && state.phase === "ready") void load(state.next);
    },
    update: (change: (items: Item[]) => Item[]) => {
      dispatch({ type: "update", change });
    },
  };
}
