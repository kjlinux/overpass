import { describe, expect, it } from "vitest";
import {
  blogModerationInput,
  commentCreateInput,
  fieldErrors,
  postCreateInput,
  postListQuery,
  postUpdateInput,
} from "../index.js";

const post = {
  language: "fr",
  category: "tutorials",
  title: "Encaisser avec Wave depuis Laravel",
  summary: "Le parcours complet, du jeton au webhook.",
  content: "## Prérequis\n\nUn compte marchand.",
};

const codes = (result: { success: boolean; error?: unknown }) =>
  result.success ? {} : fieldErrors(result.error as Parameters<typeof fieldErrors>[0]);

describe("postCreateInput", () => {
  it("defaults to a member draft", () => {
    const parsed = postCreateInput.parse(post);
    expect(parsed.kind).toBe("member");
    expect(parsed.status).toBe("draft");
  });

  it("accepts a scheduled publication date and a translation link", () => {
    const parsed = postCreateInput.parse({
      ...post,
      kind: "news",
      status: "published",
      publishAt: "2026-10-20T08:00:00.000Z",
      translationOf: "0f8fad5b-d9cb-469f-a165-70867728950e",
    });
    expect(parsed.publishAt?.toISOString()).toBe("2026-10-20T08:00:00.000Z");
  });

  it("returns one code per invalid field", () => {
    const result = postCreateInput.safeParse({
      ...post,
      category: "gossip",
      summary: "x".repeat(400),
      publishAt: "tomorrow",
      kind: "guest",
    });
    expect(codes(result)).toEqual({
      category: "post_category_invalid",
      summary: "summary_invalid",
      publishAt: "publish_at_invalid",
      kind: "kind_invalid",
    });
  });

  it("refuses unknown fields such as an author or a star count", () => {
    expect(codes(postCreateInput.safeParse({ ...post, stars: 9 }))).toEqual({
      _form: "unknown_field",
    });
  });
});

describe("postUpdateInput", () => {
  it("accepts a partial change and refuses an empty one", () => {
    expect(postUpdateInput.parse({ status: "published" }).status).toBe("published");
    expect(codes(postUpdateInput.safeParse({}))).toEqual({ _form: "nothing_to_update" });
  });

  it("does not let an update change the kind or the language", () => {
    expect(codes(postUpdateInput.safeParse({ kind: "news" }))).toEqual({ _form: "unknown_field" });
  });
});

describe("postListQuery", () => {
  it("defaults to the recent feed and twenty posts", () => {
    expect(postListQuery.parse({})).toMatchObject({ feed: "recent", limit: 20 });
  });

  it("treats empty filters as absent and validates the rest", () => {
    expect(postListQuery.parse({ category: "", author: "" }).category).toBeUndefined();
    expect(codes(postListQuery.safeParse({ feed: "trending" }))).toEqual({ feed: "feed_invalid" });
    expect(codes(postListQuery.safeParse({ author: "Not A Handle" }))).toEqual({
      author: "handle_invalid",
    });
  });
});

describe("commentCreateInput", () => {
  it("trims the comment and bounds its length", () => {
    expect(commentCreateInput.parse({ content: "  Merci  " }).content).toBe("Merci");
    expect(codes(commentCreateInput.safeParse({ content: "x".repeat(5001) }))).toEqual({
      content: "comment_too_long",
    });
    expect(codes(commentCreateInput.safeParse({ content: "  " }))).toEqual({
      content: "body_required",
    });
  });
});

describe("blogModerationInput", () => {
  it("accepts hide, block and restore only", () => {
    expect(blogModerationInput.parse({ action: "block" }).action).toBe("block");
    expect(codes(blogModerationInput.safeParse({ action: "delete" }))).toEqual({
      action: "action_invalid",
    });
  });
});
