import { describe, expect, it } from "vitest";
import {
  checkCreateInput,
  fieldErrors,
  fieldMessage,
  potholeCreateInput,
  potholeUpdateInput,
  routeCreateInput,
  routeListQuery,
  routeTemplate,
  routeUpdateInput,
  supportedLanguages,
} from "../index.js";

const route = {
  service: "wave",
  country: "CI",
  stack: "laravel",
  language: "fr",
  title: "Encaisser un paiement Wave Checkout depuis Laravel",
  content: "## Prérequis\n\nUn compte marchand.",
};

const codes = (result: { success: boolean; error?: unknown }) =>
  result.success ? {} : fieldErrors(result.error as Parameters<typeof fieldErrors>[0]);

describe("routeCreateInput", () => {
  it("accepts a complete itinerary and trims the title", () => {
    expect(routeCreateInput.parse({ ...route, title: `  ${route.title} ` }).title).toBe(
      route.title,
    );
  });

  it("leaves the content optional so the template can fill it", () => {
    const withoutContent = { ...route, content: undefined };
    expect(routeCreateInput.parse(withoutContent).content).toBeUndefined();
  });

  it("returns one code per invalid field", () => {
    const result = routeCreateInput.safeParse({
      service: "Wave Money!",
      country: "FR",
      stack: "cobol",
      language: "de",
      title: "abc",
      content: "x".repeat(50_001),
      translationOf: "not-a-uuid",
    });
    expect(codes(result)).toEqual({
      service: "service_invalid",
      country: "country_invalid",
      stack: "stack_invalid",
      language: "language_invalid",
      title: "title_invalid",
      content: "content_too_long",
      translationOf: "id_invalid",
    });
  });

  it("rejects unknown fields such as a state", () => {
    expect(codes(routeCreateInput.safeParse({ ...route, state: "clear" }))).toEqual({
      _form: "unknown_field",
    });
  });
});

describe("routeUpdateInput", () => {
  it("accepts a partial change", () => {
    expect(routeUpdateInput.parse({ title: "Nouveau titre de fiche" })).toEqual({
      title: "Nouveau titre de fiche",
    });
  });

  it("refuses an empty change and a language change", () => {
    expect(codes(routeUpdateInput.safeParse({}))).toEqual({ _form: "nothing_to_update" });
    expect(codes(routeUpdateInput.safeParse({ language: "en" }))).toEqual({
      _form: "unknown_field",
    });
  });
});

describe("routeListQuery", () => {
  it("defaults to 20 items and ignores empty filters", () => {
    expect(routeListQuery.parse({ q: " ", country: "" })).toEqual({ limit: 20 });
  });

  it("parses every filter from query strings", () => {
    const query = { q: "wave", service: "wave", country: "SN", stack: "nodejs", language: "en" };
    expect(routeListQuery.parse({ ...query, state: "broken", limit: "5" })).toEqual({
      ...query,
      state: "broken",
      limit: 5,
    });
  });

  it("rejects an unknown state and an oversized page", () => {
    expect(codes(routeListQuery.safeParse({ state: "open", limit: "500" }))).toEqual({
      state: "state_invalid",
      limit: "limit_invalid",
    });
  });
});

describe("check and pothole inputs", () => {
  it("accepts a country and an environment", () => {
    expect(checkCreateInput.parse({ country: "CI", environment: "production" })).toEqual({
      country: "CI",
      environment: "production",
    });
  });

  it("rejects an unknown environment", () => {
    expect(codes(checkCreateInput.safeParse({ country: "CI", environment: "staging" }))).toEqual({
      environment: "environment_invalid",
    });
  });

  it("requires a described pothole", () => {
    expect(codes(potholeCreateInput.safeParse({ description: "court" }))).toEqual({
      description: "description_invalid",
    });
  });

  it("only lets the status move to confirmed or resolved", () => {
    expect(potholeUpdateInput.parse({ status: "resolved" })).toEqual({ status: "resolved" });
    expect(codes(potholeUpdateInput.safeParse({ status: "open" }))).toEqual({
      status: "status_invalid",
    });
  });
});

describe("fieldMessage", () => {
  it("falls back to the required message for a code it does not know", () => {
    expect(fieldMessage("no_such_code", "fr")).toBe(fieldMessage("required", "fr"));
  });
});

describe("routeTemplate", () => {
  it("offers a Markdown template in every supported language", () => {
    for (const language of supportedLanguages) {
      expect(routeTemplate(language)).toMatch(/^## /);
    }
  });
});
