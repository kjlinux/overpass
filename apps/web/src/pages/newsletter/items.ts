import type { IssueItem, IssueItemRef } from "@overpass/shared";

/** Moves one item by delta places; returns the same list when the move leaves its bounds. */
export function moveItem(items: IssueItem[], index: number, delta: -1 | 1): IssueItem[] {
  const target = index + delta;
  const moving = items[index];
  if (moving === undefined || target < 0 || target >= items.length) return items;
  const rest = items.filter((_, position) => position !== index);
  return [...rest.slice(0, target), moving, ...rest.slice(target)];
}

export function removeItem(items: IssueItem[], index: number): IssueItem[] {
  return items.filter((_, position) => position !== index);
}

/** The API stores references only; titles and summaries are rebuilt when the issue is read. */
export function itemRefs(items: IssueItem[]): IssueItemRef[] {
  return items.map(({ kind, id }) => ({ kind, id }));
}
