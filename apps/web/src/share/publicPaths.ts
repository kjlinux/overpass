/** Static public pages pre-rendered with their own share tags; keys index share/locales. */
export const publicPages = {
  home: "/",
  routes: "/routes",
  sandbox: "/sandbox",
  demo: "/sandbox/demo",
  discussions: "/discussions",
  ranking: "/ranking",
  simulators: "/simulator-requests",
  blog: "/blog",
  newsletter: "/newsletter",
  docs: "/docs",
  pricing: "/pricing",
  about: "/about",
  legal: "/legal",
  privacy: "/privacy",
  signUp: "/sign-up",
  signIn: "/sign-in",
} as const;

export type PublicPage = keyof typeof publicPages;

/** Finds the static public page of a path without its language prefix. */
export function pageOfPath(path: string): PublicPage | undefined {
  const trimmed = path.length > 1 ? path.replace(/\/+$/, "") : path;
  const entry = Object.entries(publicPages).find(([, page]) => page === trimmed);
  return entry?.[0] as PublicPage | undefined;
}
