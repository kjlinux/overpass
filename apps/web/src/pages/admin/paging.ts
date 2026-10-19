import type { ApiError } from "@overpass/shared";

export type Page<Item> = { items: Item[]; next: string | null };

/** "more" keeps the loaded rows on screen while the next page arrives. */
export type Paged<Item> = {
  items: Item[];
  next: string | null;
  phase: "loading" | "ready" | "more";
  error: ApiError | undefined;
};

export type PagedAction<Item> =
  | { type: "start" }
  | { type: "more" }
  | { type: "page"; page: Page<Item>; append: boolean }
  | { type: "fail"; error: ApiError }
  | { type: "update"; change: (items: Item[]) => Item[] };

export const initialPaged = <Item>(): Paged<Item> => ({
  items: [],
  next: null,
  phase: "loading",
  error: undefined,
});

export function pagedReducer<Item>(state: Paged<Item>, action: PagedAction<Item>): Paged<Item> {
  switch (action.type) {
    case "start":
      return initialPaged();
    case "more":
      return { ...state, phase: "more", error: undefined };
    case "page": {
      const items = action.append ? [...state.items, ...action.page.items] : action.page.items;
      return { items, next: action.page.next, phase: "ready", error: undefined };
    }
    case "fail":
      return { ...state, phase: "ready", error: action.error };
    case "update":
      return { ...state, items: action.change(state.items) };
  }
}

/** The API hands back an opaque cursor; it goes back untouched as a query parameter. */
export function withCursor(path: string, cursor: string | undefined): string {
  if (cursor === undefined) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}cursor=${encodeURIComponent(cursor)}`;
}
