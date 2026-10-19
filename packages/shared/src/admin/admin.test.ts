import { describe, expect, it } from "vitest";
import {
  adminAccountsQuery,
  adminQueueQuery,
  apiMessages,
  fieldErrors,
  queueItemSchema,
  routeModerationInput,
  routeReportInput,
  statsSchema,
  suspensionInput,
} from "../index.js";

const codes = (result: { success: boolean; error?: unknown }) =>
  result.success ? {} : fieldErrors(result.error as Parameters<typeof fieldErrors>[0]);

describe("routeReportInput", () => {
  it("keeps a trimmed reason", () => {
    expect(routeReportInput.parse({ reason: "  Lien mort  " }).reason).toBe("Lien mort");
  });

  it("refuses a missing, short or long reason", () => {
    expect(codes(routeReportInput.safeParse({}))).toEqual({ reason: "required" });
    expect(codes(routeReportInput.safeParse({ reason: "no" }))).toEqual({
      reason: "report_reason_invalid",
    });
    expect(codes(routeReportInput.safeParse({ reason: "x".repeat(501) }))).toEqual({
      reason: "report_reason_invalid",
    });
  });
});

describe("routeModerationInput", () => {
  it("accepts hide and restore with an optional reason", () => {
    expect(routeModerationInput.parse({ decision: "hide" }).reason).toBeUndefined();
    expect(routeModerationInput.parse({ decision: "restore", reason: "ok" }).reason).toBe("ok");
  });

  it("refuses another decision", () => {
    expect(codes(routeModerationInput.safeParse({ decision: "remove" }))).toEqual({
      decision: "decision_invalid",
    });
  });
});

describe("suspensionInput", () => {
  it("requires a reason", () => {
    expect(codes(suspensionInput.safeParse({}))).toEqual({ reason: "required" });
    expect(codes(suspensionInput.safeParse({ reason: "" }))).toEqual({
      reason: "suspension_reason_invalid",
    });
  });
});

describe("admin queries", () => {
  it("defaults the queue to itineraries and treats empty filters as absent", () => {
    expect(adminQueueQuery.parse({ kind: "", cursor: "" })).toEqual({
      kind: "route",
      state: "open",
    });
    expect(adminQueueQuery.parse({ state: "hidden" }).state).toBe("hidden");
    expect(codes(adminQueueQuery.safeParse({ state: "closed" }))).toEqual({
      state: "state_invalid",
    });
    expect(codes(adminQueueQuery.safeParse({ kind: "user" }))).toEqual({ kind: "kind_invalid" });
  });

  it("lower-cases the account search", () => {
    expect(adminAccountsQuery.parse({ q: " Awa@" }).q).toBe("awa@");
  });
});

describe("admin outputs", () => {
  it("parses a queue item without reports and the public figures", () => {
    const item = {
      kind: "route",
      id: "0f8fad5b-d9cb-469f-a165-70867728950e",
      title: "Encaisser avec Wave",
      excerpt: "",
      author: "dev-a",
      reports: 0,
      lastReportAt: null,
      status: "hidden",
      path: "/routes/0f8fad5b-d9cb-469f-a165-70867728950e",
    };
    expect(queueItemSchema.parse(item)).toEqual(item);
    const stats = { routes: 2, checks: 1, countries: ["CI"], updatedAt: "2026-10-16T12:00:00Z" };
    expect(statsSchema.parse(stats)).toEqual(stats);
  });

  it("translates every new error code in both languages", () => {
    for (const code of ["account_suspended", "suspend_self", "suspend_admin"] as const) {
      expect(apiMessages.fr.errors[code]).not.toBe("");
      expect(apiMessages.en.errors[code]).not.toBe("");
    }
  });
});
