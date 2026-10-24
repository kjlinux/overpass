export type ScreenKind = "lines" | "track" | "bars" | "article" | "thread";

export type TourBlock = { key: string; screen: ScreenKind; links: { key: string; path: string }[] };

/** Every module of the product, integrations first, community next, each with its own screen. */
export const tourBlocks: readonly TourBlock[] = [
  {
    key: "routes",
    screen: "lines",
    links: [
      { key: "browse", path: "/routes" },
      { key: "publish", path: "/routes/new" },
    ],
  },
  { key: "track", screen: "track", links: [{ key: "open", path: "/sandbox" }] },
  { key: "relay", screen: "lines", links: [{ key: "open", path: "/sandbox" }] },
  {
    key: "mcp",
    screen: "lines",
    links: [
      { key: "docs", path: "/docs" },
      { key: "token", path: "/settings" },
    ],
  },
  { key: "discussions", screen: "thread", links: [{ key: "open", path: "/discussions" }] },
  {
    key: "blog",
    screen: "article",
    links: [
      { key: "open", path: "/blog" },
      { key: "newsletter", path: "/newsletter" },
    ],
  },
  { key: "ranking", screen: "bars", links: [{ key: "open", path: "/ranking" }] },
  {
    key: "requests",
    screen: "bars",
    links: [
      { key: "propose", path: "/services/propose" },
      { key: "vote", path: "/simulator-requests" },
    ],
  },
];
