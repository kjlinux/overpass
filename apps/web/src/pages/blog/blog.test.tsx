import type { CommentPage, PostDetail, PostSummary } from "@overpass/shared";
import i18next from "i18next";
import { LocationProvider } from "preact-iso";
import { render } from "preact-render-to-string";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { validateAll } from "../../forms";
import { setupTestI18n } from "../../i18n/test-i18n";
import ui from "../../components/ui/locales/fr.json";
import fr from "./locales/fr.json";
import { emptyPost, postFormSchema } from "./postValues";
import {
  ArticleView,
  FeedTabs,
  PostForm,
  PostList,
  blogQueryFrom,
  blogSearch,
  postsPath,
} from "./index";

beforeAll(async () => {
  await setupTestI18n("fr");
  vi.stubGlobal("location", new URL("/fr/blog", "http://localhost"));
});

const page = (node: preact.ComponentChildren) =>
  render(<LocationProvider>{node}</LocationProvider>);

const summary: PostSummary = {
  id: "00000000-0000-4000-8000-000000000001",
  slug: "encaisser-avec-wave",
  kind: "member",
  language: "fr",
  category: "tutorials",
  title: "Encaisser avec Wave depuis Laravel",
  summary: "Le parcours complet, du jeton au webhook.",
  cover: null,
  author: { handle: "awa", country: "SN" },
  status: "published",
  moderation: "visible",
  publishedAt: "2026-10-14T12:00:00.000Z",
  stars: 3,
  comments: 1,
  translation: { language: "en", slug: "collect-with-wave" },
};

const post: PostDetail = {
  ...summary,
  content: "## Prérequis\n\nUne clé de test **Wave**.",
  related: [
    {
      ...summary,
      id: "00000000-0000-4000-8000-000000000009",
      slug: "autre",
      title: "Un autre article",
    },
  ],
  viewer: { isAuthor: false, isAdmin: false, starred: true, reported: false, followsAuthor: false },
};

const comments: CommentPage = {
  items: [
    {
      id: "00000000-0000-4000-8000-000000000002",
      author: "moussa",
      content: "Merci pour le **pas à pas**.",
      moderation: "visible",
      createdAt: "2026-10-15T12:00:00.000Z",
      viewer: { isAuthor: false, reported: false },
    },
  ],
  nextCursor: null,
};

const noop = () => Promise.resolve(undefined);
const actions = { star: noop, unstar: noop, report: noop, comment: noop };

describe("feed query in the URL", () => {
  it("keeps the feed and category, drops unknown values", () => {
    expect(blogQueryFrom("feed=forme&category=portraits&x=1")).toEqual({
      feed: "forme",
      category: "portraits",
    });
    expect(blogQueryFrom("feed=trending")).toEqual({});
    expect(blogSearch({ category: "tutorials" }, "abc")).toBe("?category=tutorials&cursor=abc");
  });

  it("asks the API for the reader's language, an author's posts included", () => {
    expect(postsPath({ feed: "news" }, "fr")).toBe("/v1/posts?feed=news&lang=fr");
    expect(postsPath({ author: "ada-k" }, "en", "abc")).toBe(
      "/v1/posts?author=ada-k&cursor=abc&lang=en",
    );
  });
});

describe("feed tabs", () => {
  it("marks the current feed and links the others", () => {
    const html = page(<FeedTabs query={{ feed: "news" }} />);
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('href="/fr/blog?feed=forme"');
    expect(html).toContain(fr.feeds.news);
  });
});

describe("post list", () => {
  it("features the first post and links every author blog", () => {
    const list = { items: [summary, { ...summary, id: "x", slug: "deux" }], nextCursor: "c" };
    const html = page(<PostList page={list} featured onMore={() => undefined} />);
    expect(html).toContain('href="/fr/blog/encaisser-avec-wave"');
    expect(html).toContain('href="/fr/blog/@awa"');
    expect(html).toContain(fr.list.more);
  });

  it("invites to write when the feed is empty", () => {
    const html = page(<PostList page={{ items: [], nextCursor: null }} onMore={() => undefined} />);
    expect(html).toContain(fr.list.emptyTitle);
  });
});

describe("article", () => {
  it("shows the text, the author, the translation, the comments and related posts", () => {
    const html = page(<ArticleView post={post} comments={comments} signedIn actions={actions} />);
    expect(html).toContain("<strong>Wave</strong>");
    expect(html).toContain('href="/fr/blog/@awa"');
    expect(html).toContain('href="/en/blog/collect-with-wave"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("<strong>pas à pas</strong>");
    expect(html).toContain("Un autre article");
  });

  it("explains a hidden post to its author", () => {
    const viewer = { ...post.viewer, isAuthor: true };
    const hidden = { ...post, moderation: "hidden" as const, viewer };
    const html = page(<ArticleView post={hidden} comments={comments} signedIn actions={actions} />);
    expect(html).toContain(fr.article.hidden);
  });

  it("shows why the comments failed to load, with a retry, instead of none", () => {
    const error = { code: "server_error", message: "Le serveur ne répond pas." };
    const html = page(
      <ArticleView
        post={post}
        comments={{ items: [], nextCursor: null }}
        commentsFailure={{ error, retry: () => undefined }}
        signedIn
        actions={actions}
      />,
    );
    expect(html).toContain(error.message);
    expect(html).toContain(ui.retry);
    expect(html).not.toContain(fr.comments.empty);
  });
});

describe("post form", () => {
  it("offers the news kind to admins only", () => {
    const member = page(<PostForm isAdmin={false} onSave={noop} />);
    const admin = page(<PostForm isAdmin onSave={noop} />);
    expect(member).not.toContain('name="kind"');
    expect(admin).toContain('name="kind"');
    expect(admin).toContain(fr.editor.saveDraft);
    expect(admin).toContain(fr.editor.publish);
  });

  it("writes a new post in the language of the interface", async () => {
    await i18next.changeLanguage("en");
    const html = page(<PostForm isAdmin={false} onSave={noop} />);
    await i18next.changeLanguage("fr");
    expect(html).toMatch(/<option selected value="en">/);
    expect(html).not.toMatch(/<option selected value="fr">/);
  });
});

describe("post form values", () => {
  it("publishes without a date, the field being optional", () => {
    const values = { ...emptyPost, title: "Encaisser avec Wave", summary: "R", content: "T" };
    expect(validateAll(postFormSchema, values).ok).toBe(true);
    expect(validateAll(postFormSchema, { ...values, publishAt: "demain" }).ok).toBe(false);
  });
});
