export type NavKey = "routes" | "sandbox" | "discussions" | "blog" | "docs" | "pricing";

export type NavItem = { key: NavKey; path: string };

/** Primary navigation, in masthead order; labels live in layout/locales. */
export const navItems: NavItem[] = [
  { key: "routes", path: "/routes" },
  { key: "sandbox", path: "/sandbox" },
  { key: "discussions", path: "/discussions" },
  { key: "blog", path: "/blog" },
  { key: "docs", path: "/docs" },
  { key: "pricing", path: "/pricing" },
];

/** Builds a language-prefixed URL from a path inside the site. */
export function localizedPath(language: string, path: string): string {
  return `/${language}${path === "/" ? "" : path}`;
}

/** Strips the language prefix from the current path, keeping the rest. */
export function pathWithoutLanguage(path: string): string {
  const rest = path.replace(/^\/[^/]+/, "");
  return rest === "" ? "/" : rest;
}
