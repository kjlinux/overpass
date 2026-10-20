import type { ApiError, Reply, ReplyPage, ThreadDetail } from "@overpass/shared";
import { LocationProvider } from "preact-iso";
import { render } from "preact-render-to-string";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { setupTestI18n } from "../../i18n/test-i18n";
import ui from "../../components/ui/locales/fr.json";
import fr from "./locales/fr.json";
import { pagesToReload, shownReplies, walkPages } from "./replyPages";
import type { ReplyPagesView } from "./replyPages";
import { ThreadView } from "./index";

beforeAll(async () => {
  await setupTestI18n("fr");
  vi.stubGlobal("location", new URL("/fr/discussions", "http://localhost"));
});

const replyOf = (n: number, content = `Réponse ${String(n)}`): Reply => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
  author: "moussa",
  content,
  status: "visible",
  useful: 0,
  accepted: false,
  createdAt: "2026-10-14T12:00:00.000Z",
  viewer: { isAuthor: false, voted: false, reported: false },
});

const accepted = { ...replyOf(99, "La réponse acceptée"), accepted: true };

const thread: ThreadDetail = {
  id: "00000000-0000-4000-8000-000000000001",
  topic: "integrations",
  title: "Le webhook Wave arrive deux fois",
  author: "awa",
  language: "fr",
  country: "SN",
  stack: null,
  route: null,
  service: null,
  state: "resolved",
  status: "visible",
  replies: 3,
  listed: 3,
  createdAt: "2026-10-13T12:00:00.000Z",
  lastActivityAt: "2026-10-14T12:00:00.000Z",
  content: "Mon endpoint reçoit chaque paiement deux fois.",
  errorText: null,
  codeText: null,
  acceptedReplyId: accepted.id,
  transformedRoute: null,
  items: [replyOf(1), replyOf(2)],
  nextCursor: "next",
  accepted,
  viewer: { isAuthor: false, isAdmin: false, reported: false, canTransform: false },
};

const failure: ApiError = { code: "server_error", message: "Le serveur ne répond pas." };
const noop = () => Promise.resolve(undefined);
const actions = { reply: noop, vote: noop, accept: noop, report: noop };
const idle: ReplyPagesView = {
  extra: [],
  next: "next",
  loading: false,
  error: undefined,
  onMore: () => undefined,
};

const view = (pages: ReplyPagesView, shown: ThreadDetail = thread) =>
  render(
    <LocationProvider>
      <ThreadView thread={shown} topic="" signedIn={false} actions={actions} pages={pages} />
    </LocationProvider>,
  );

describe("reply pages", () => {
  it("merges the pages once and keeps the accepted reply out of the list", () => {
    const shown = shownReplies(thread, [replyOf(2), replyOf(3), accepted]);
    expect(shown.map((reply) => reply.id)).toEqual([1, 2, 3].map((n) => replyOf(n).id));
  });

  it("walks the pages again after a reload and stops at the first failure", async () => {
    const pages: Record<string, ReplyPage> = {
      a: { items: [replyOf(3)], nextCursor: "b" },
      b: { items: [replyOf(4)], nextCursor: "c" },
    };
    const fetchPage = (cursor: string) =>
      Promise.resolve(
        pages[cursor] === undefined
          ? { data: null, error: failure }
          : { data: pages[cursor], error: null },
      );
    const walked = await walkPages(fetchPage, "a", 2);
    expect(walked).toMatchObject({ pages: 2, next: "c", error: undefined });
    expect(walked.items).toHaveLength(2);
    expect(await walkPages(fetchPage, "a", 3)).toMatchObject({ pages: 2, error: failure });
    expect(await walkPages(fetchPage, null, 3)).toMatchObject({ pages: 0, next: null });
  });
});

describe("thread replies", () => {
  it("pins the accepted reply even when it is not on a loaded page", () => {
    const html = view(idle, { ...thread, items: [] });
    expect(html).toContain("La réponse acceptée");
    expect(html).toContain(fr.reply.accepted);
  });

  it("offers the next page while one remains", () => {
    expect(view(idle)).toContain(fr.detail.more);
    expect(view({ ...idle, next: null })).not.toContain(fr.detail.more);
  });

  it("shows the button busy while the next page loads", () => {
    expect(view({ ...idle, loading: true })).toContain('aria-busy="true"');
  });

  it("shows the error and a retry when the next page fails", () => {
    const html = view({ ...idle, error: failure });
    expect(html).toContain('role="alert"');
    expect(html).toContain(ui.retry);
  });
});

describe("reloading a thread", () => {
  it("walks again the pages already opened and the one still on its way", () => {
    expect(pagesToReload({ sameThread: true, opened: 2, inFlight: 1 })).toBe(3);
    expect(pagesToReload({ sameThread: true, opened: 0, inFlight: 0 })).toBe(0);
  });

  it("starts from the first page when the reader moved to another thread", () => {
    expect(pagesToReload({ sameThread: false, opened: 4, inFlight: 1 })).toBe(0);
  });
});
