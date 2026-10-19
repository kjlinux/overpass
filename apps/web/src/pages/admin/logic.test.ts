import type { AdminAccount, Me, QueueItem } from "@overpass/shared";
import { describe, expect, it } from "vitest";
import { afterDecision, decisionRequest, decisionsFor, queuePath, reasonError } from "./decisions";
import { initialPaged, pagedReducer, withCursor } from "./paging";
import { canReactivate, canSuspend } from "./permissions";

const item = (kind: QueueItem["kind"], status: QueueItem["status"] = "visible"): QueueItem => ({
  kind,
  id: "0f8fad5b-d9cb-469f-a165-70867728950e",
  title: "Encaisser avec Wave",
  excerpt: "",
  author: "awa",
  reports: 2,
  lastReportAt: "2026-10-16T12:00:00.000Z",
  status,
  path: "/routes/0f8fad5b-d9cb-469f-a165-70867728950e",
});

describe("paged list", () => {
  it("replaces the items on a first page and appends the next ones", () => {
    const first = pagedReducer<number>(initialPaged(), {
      type: "page",
      page: { items: [1, 2], next: "c1" },
      append: false,
    });
    expect(first).toMatchObject({ items: [1, 2], next: "c1", phase: "ready" });
    const more = pagedReducer(pagedReducer(first, { type: "more" }), {
      type: "page",
      page: { items: [3], next: null },
      append: true,
    });
    expect(more).toMatchObject({ items: [1, 2, 3], next: null, phase: "ready" });
  });

  it("keeps the loaded items when a page fails", () => {
    const ready = { ...initialPaged<number>(), items: [1], next: "c", phase: "ready" as const };
    const failed = pagedReducer(ready, { type: "fail", error: { code: "network", message: "" } });
    expect(failed.items).toEqual([1]);
    expect(failed.error?.code).toBe("network");
  });

  it("starts over on a new filter and updates items without mutation", () => {
    const ready = { ...initialPaged<number>(), items: [1, 2], phase: "ready" as const };
    expect(pagedReducer(ready, { type: "start" })).toEqual(initialPaged());
    const updated = pagedReducer(ready, { type: "update", change: (all) => all.slice(1) });
    expect(updated.items).toEqual([2]);
    expect(ready.items).toEqual([1, 2]);
  });

  it("passes the cursor back in the query string", () => {
    expect(withCursor("/v1/admin/log", undefined)).toBe("/v1/admin/log");
    expect(withCursor("/v1/admin/queue?kind=post", "a b")).toBe(
      "/v1/admin/queue?kind=post&cursor=a%20b",
    );
    expect(withCursor("/v1/admin/log", "x")).toBe("/v1/admin/log?cursor=x");
  });
});

describe("queue decisions", () => {
  it("offers the decisions each kind of content accepts", () => {
    expect(decisionsFor(item("route"))).toEqual(["hide", "restore"]);
    expect(decisionsFor(item("route", "hidden"))).toEqual(["restore"]);
    expect(decisionsFor(item("thread"))).toEqual(["restore", "remove"]);
    expect(decisionsFor(item("post"))).toEqual(["hide", "block", "suspendBlog"]);
    expect(decisionsFor(item("comment", "hidden"))).toEqual(["block", "restore", "suspendBlog"]);
    expect(decisionsFor({ ...item("post"), author: "" })).toEqual(["hide", "block"]);
  });

  it("sends each decision to the module that owns the content", () => {
    const id = item("route").id;
    expect(decisionRequest(item("route"), "hide", "Spam")).toEqual({
      path: `/v1/admin/routes/${id}/moderation`,
      body: { decision: "hide", reason: "Spam" },
    });
    expect(decisionRequest(item("route"), "restore", "").body).toEqual({ decision: "restore" });
    expect(decisionRequest(item("reply"), "remove", "x")).toEqual({
      path: `/v1/moderation/reply/${id}`,
      body: { decision: "remove" },
    });
    expect(decisionRequest(item("comment"), "block", "")).toEqual({
      path: `/v1/moderation/blog/comment/${id}`,
      body: { action: "block" },
    });
    expect(decisionRequest(item("post"), "suspendBlog", "")).toEqual({
      path: "/v1/moderation/blogs/awa/suspension",
      body: { suspended: true },
    });
  });

  it("takes every decided content out of the current view, except a blog suspension", () => {
    const route = item("route");
    const thread = { ...item("thread"), id: "x" };
    const list = [route, thread];
    expect(afterDecision(list, route, "hide")).toEqual([thread]);
    expect(afterDecision(list, route, "restore")).toEqual([thread]);
    expect(afterDecision(list, thread, "remove")).toEqual([route]);
    expect(afterDecision(list, route, "suspendBlog")).toEqual(list);
  });

  it("asks the queue for one kind and one state", () => {
    expect(queuePath("route", "open")).toBe("/v1/admin/queue?kind=route&state=open");
    expect(queuePath("comment", "hidden")).toBe("/v1/admin/queue?kind=comment&state=hidden");
  });

  it("validates the reason of a decision and of a suspension", () => {
    expect(reasonError("optional", "")).toBeUndefined();
    expect(reasonError("optional", "x".repeat(501))).toBe("reason_invalid");
    expect(reasonError("required", "")).toBe("suspension_reason_invalid");
    expect(reasonError("required", "Spam répété")).toBeUndefined();
  });
});

const me = { id: "me", role: "admin" } as Me;
const account = (patch: Partial<AdminAccount>): AdminAccount => ({
  id: "other",
  handle: "awa",
  email: "awa@example.com",
  country: "SN",
  role: "member",
  createdAt: "2026-10-01T00:00:00.000Z",
  suspendedAt: null,
  ...patch,
});

describe("account permissions", () => {
  it("lets an admin suspend an active member only", () => {
    expect(canSuspend(me, account({}))).toBe(true);
    expect(canSuspend(me, account({ suspendedAt: "2026-10-02T00:00:00.000Z" }))).toBe(false);
    expect(canSuspend(me, account({ role: "admin" }))).toBe(false);
    expect(canSuspend(me, account({ id: "me" }))).toBe(false);
  });

  it("lets an admin reactivate a suspended member only", () => {
    const suspended = account({ suspendedAt: "2026-10-02T00:00:00.000Z" });
    expect(canReactivate(me, suspended)).toBe(true);
    expect(canReactivate(me, account({}))).toBe(false);
    expect(canReactivate(me, { ...suspended, role: "admin" })).toBe(false);
    expect(canReactivate({ ...me, role: "member" }, suspended)).toBe(false);
  });
});
