import type { Issue, IssueItem } from "@overpass/shared";
import { LocationProvider } from "preact-iso";
import { render } from "preact-render-to-string";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { setupTestI18n } from "../../i18n/test-i18n";
import layoutFr from "../../layout/locales/fr.json";
import fr from "./locales/fr.json";
import { IssueList, SubscribeForm, moveItem, removeItem } from "./index";

beforeAll(async () => {
  await setupTestI18n("fr");
  vi.stubGlobal("location", new URL("/fr/newsletter", "http://localhost"));
});

const page = (node: preact.ComponentChildren) =>
  render(<LocationProvider>{node}</LocationProvider>);

const item = (id: string, title: string): IssueItem => ({
  kind: "route",
  id,
  title,
  summary: "",
  path: `/routes/${id}`,
});

const issue: Issue = {
  id: "00000000-0000-4000-8000-000000000010",
  number: 7,
  language: "fr",
  subject: "Les itinéraires de la semaine",
  intro: "",
  items: [],
  status: "sent",
  createdAt: "2026-10-12T08:00:00.000Z",
  queuedAt: "2026-10-12T09:00:00.000Z",
  sentAt: "2026-10-12T10:00:00.000Z",
  recipients: 120,
  delivered: 118,
};

describe("subscribe form", () => {
  it("asks for an address and a language, preselecting the page language", () => {
    const html = page(<SubscribeForm language="en" />);
    expect(html).toContain('type="email"');
    expect(html).toContain('autocomplete="email"');
    expect(html).toMatch(/<option[^>]*selected[^>]*value="en"/);
    expect(html).toContain(layoutFr.newsletter.subscribe);
    expect(html).toContain(layoutFr.newsletter.note);
    expect(html).not.toMatch(/\sdisabled[\s=>]/);
  });

  it("gives each form its own field ids so two can share a page", () => {
    const html = page(
      <>
        <SubscribeForm language="fr" />
        <SubscribeForm language="fr" variant="compact" />
      </>,
    );
    const ids = [...html.matchAll(/ id="([^"]+-email)"/g)].map((match) => match[1]);
    expect(new Set(ids).size).toBe(2);
  });
});

describe("issue list", () => {
  it("shows the number, subject, status and delivery of each issue", () => {
    const html = page(<IssueList issues={[issue]} onOpen={() => undefined} />);
    expect(html).toContain("7");
    expect(html).toContain(issue.subject);
    expect(html).toContain(fr.admin.status.sent);
    expect(html).toContain("118");
    expect(html).toContain("120");
  });

  it("says when no issue exists yet", () => {
    const html = page(<IssueList issues={[]} onOpen={() => undefined} />);
    expect(html).toContain(fr.admin.emptyTitle);
  });
});

describe("issue items", () => {
  const items = [item("a", "A"), item("b", "B"), item("c", "C")];

  it("moves an item without touching the original list", () => {
    expect(moveItem(items, 2, -1).map((entry) => entry.id)).toEqual(["a", "c", "b"]);
    expect(moveItem(items, 0, -1)).toBe(items);
    expect(items.map((entry) => entry.id)).toEqual(["a", "b", "c"]);
  });

  it("removes an item by position", () => {
    expect(removeItem(items, 1).map((entry) => entry.id)).toEqual(["a", "c"]);
  });
});
