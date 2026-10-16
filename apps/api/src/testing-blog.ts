import type { FastifyInstance } from "fastify";
import { call } from "./testing-routes.js";
import type { Body } from "./testing-routes.js";

export const samplePost = {
  language: "fr",
  category: "tutorials",
  title: "Encaisser avec Wave depuis Laravel",
  summary: "Le parcours complet, du jeton au webhook.",
  content: "## Prérequis\n\nUn compte marchand et une clé de test.",
  status: "published",
};

export type WrittenPost = { id: string; slug: string };

/** Writes a post, published by default, and returns its id and slug. */
export async function writePost(
  app: FastifyInstance,
  cookie: string,
  overrides: Record<string, unknown> = {},
): Promise<WrittenPost> {
  const { status, body } = await call(app, "POST", "/v1/posts", {
    cookie,
    payload: { ...samplePost, ...overrides },
  });
  if (status !== 201) throw new Error(`post failed with ${String(status)}`);
  return { id: String(body.data?.id), slug: String(body.data?.slug) };
}

/** The slugs of a feed page, in order. */
export async function feedSlugs(
  app: FastifyInstance,
  query = "",
  cookie?: string,
): Promise<string[]> {
  const options = cookie === undefined ? {} : { cookie };
  const { body } = await call(app, "GET", `/v1/posts${query}`, options);
  return itemsOf(body).map((item) => String(item.slug));
}

export function itemsOf(body: Body): Record<string, unknown>[] {
  return (body.data?.items ?? []) as Record<string, unknown>[];
}

/** The raw RSS document of a language. */
export async function rss(app: FastifyInstance, lang = "fr"): Promise<string> {
  const response = await app.inject({ method: "GET", url: `/v1/posts/feed.xml?lang=${lang}` });
  return response.body;
}

export const star = (app: FastifyInstance, cookie: string, postId: string) =>
  call(app, "POST", `/v1/posts/${postId}/star`, { cookie });

export const follow = (app: FastifyInstance, cookie: string, handle: string) =>
  call(app, "POST", `/v1/blogs/${handle}/follow`, { cookie });
