import { describe, expect, it } from "vitest";
import {
  fieldErrors,
  issueCreateInput,
  issueUpdateInput,
  newsletterRules,
  newsletterTokenInput,
  subscribeInput,
} from "../index.js";

const codes = (result: { success: boolean; error?: unknown }) =>
  result.success ? {} : fieldErrors(result.error as Parameters<typeof fieldErrors>[0]);

const item = { kind: "post", id: "0f8fad5b-d9cb-469f-a165-70867728950e" };

describe("subscribeInput", () => {
  it("normalises the address and requires a language", () => {
    expect(subscribeInput.parse({ email: " Ada@Example.COM ", language: "en" })).toEqual({
      email: "ada@example.com",
      language: "en",
    });
    expect(codes(subscribeInput.safeParse({ email: "ada" }))).toEqual({
      email: "email_invalid",
      language: "required",
    });
  });
});

describe("newsletterTokenInput", () => {
  it("accepts an opaque url-safe token of bounded length", () => {
    expect(newsletterTokenInput.parse({ token: "a".repeat(43) }).token).toHaveLength(43);
    expect(codes(newsletterTokenInput.safeParse({ token: "short" }))).toEqual({
      token: "token_invalid",
    });
    expect(codes(newsletterTokenInput.safeParse({ token: "a b".repeat(20) }))).toEqual({
      token: "token_invalid",
    });
  });
});

describe("issueCreateInput", () => {
  const issue = {
    language: "fr",
    subject: "Overpass, semaine 42",
    intro: "Bonjour.",
    items: [item],
  };

  it("accepts a reviewed issue made of references", () => {
    expect(issueCreateInput.parse(issue).items).toEqual([item]);
  });

  it("refuses an empty subject, an unknown kind and too many items", () => {
    const tooMany = Array.from({ length: newsletterRules.maxItems + 1 }, () => item);
    expect(
      codes(
        issueCreateInput.safeParse({ ...issue, subject: " ", items: [{ kind: "x", id: "1" }] }),
      ),
    ).toEqual({ subject: "subject_invalid", items: "items_invalid" });
    expect(codes(issueCreateInput.safeParse({ ...issue, items: tooMany }))).toEqual({
      items: "items_invalid",
    });
  });
});

describe("issueUpdateInput", () => {
  it("accepts a partial change and refuses an empty one", () => {
    expect(issueUpdateInput.parse({ intro: "" }).intro).toBe("");
    expect(codes(issueUpdateInput.safeParse({}))).toEqual({ _form: "nothing_to_update" });
  });
});
