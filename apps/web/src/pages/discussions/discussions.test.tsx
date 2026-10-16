import type { ThreadDetail, ThreadPage } from "@overpass/shared";
import { LocationProvider } from "preact-iso";
import { render } from "preact-render-to-string";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { setupTestI18n } from "../../i18n/test-i18n";
import { threadDraft } from "../routes";
import fr from "./locales/fr.json";
import { ThreadList, ThreadView, maskedValues, threadQueryFrom, threadSearch } from "./index";

beforeAll(async () => {
  await setupTestI18n("fr");
  vi.stubGlobal("location", new URL("/fr/discussions", "http://localhost"));
});

const page = (node: preact.ComponentChildren) =>
  render(<LocationProvider>{node}</LocationProvider>);

const summary = {
  id: "00000000-0000-4000-8000-000000000001",
  topic: "integrations" as const,
  title: "Le webhook Wave arrive deux fois",
  author: "awa",
  language: "fr" as const,
  country: "SN",
  stack: "laravel",
  route: null,
  service: { slug: "wave", name: "Wave" },
  state: "resolved" as const,
  status: "visible" as const,
  replies: 2,
  createdAt: "2026-10-13T12:00:00.000Z",
  lastActivityAt: "2026-10-14T12:00:00.000Z",
};

const reply = {
  id: "00000000-0000-4000-8000-000000000002",
  author: "moussa",
  content: "Vérifiez l'en-tête **Idempotency-Key**.",
  status: "visible" as const,
  useful: 3,
  accepted: true,
  createdAt: "2026-10-14T12:00:00.000Z",
  viewer: { isAuthor: false, voted: false, reported: false },
};

const thread: ThreadDetail = {
  ...summary,
  content: "Mon endpoint reçoit chaque paiement deux fois.",
  errorText: null,
  codeText: "Route::post('/webhook', WaveController::class);",
  acceptedReplyId: reply.id,
  transformedRoute: null,
  items: [reply],
  viewer: { isAuthor: true, isAdmin: false, reported: false, canTransform: true },
};

const noop = () => Promise.resolve(undefined);
const actions = { reply: noop, vote: noop, accept: noop, report: noop };

describe("thread filters in the URL", () => {
  it("keeps known filters and drops an unknown theme", () => {
    expect(threadQueryFrom("topic=politics&country=SN&state=resolved")).toEqual({
      country: "SN",
      state: "resolved",
    });
    expect(threadSearch({ topic: "cloud", country: "CI" }, "abc")).toBe(
      "?topic=cloud&country=CI&cursor=abc",
    );
  });
});

describe("masked preview", () => {
  it("masks a pasted key exactly as the API will", () => {
    const key = "wave_sn_prod_YhUNAUh7SY8w2A4gBLGTEVR3RkQhWaWZ";
    const masked = maskedValues({ title: "", content: `clé ${key}`, errorText: "", codeText: "" });
    expect(masked.found).toBe(1);
    expect(masked.values.content).not.toContain("YhUNAUh7SY8w2A4gBLGTEVR3RkQhWaWZ");
  });
});

describe("thread list", () => {
  it("shows each thread with its state, theme and replies", () => {
    const list: ThreadPage = { items: [summary], nextCursor: null };
    const topics = [
      { slug: "integrations" as const, name: "Intégrations et API", description: "", threads: 1 },
    ];
    const html = page(<ThreadList page={list} topics={topics} onMore={() => undefined} />);
    expect(html).toContain(`href="/fr/discussions/${summary.id}"`);
    expect(html).toContain("Résolu");
    expect(html).toContain("Intégrations et API");
    expect(html).toContain("2 réponses");
  });

  it("invites to open a thread when nothing matches", () => {
    const html = page(
      <ThreadList page={{ items: [], nextCursor: null }} topics={[]} onMore={() => undefined} />,
    );
    expect(html).toContain(fr.list.emptyTitle);
  });
});

describe("thread detail", () => {
  it("offers the author to turn the resolved thread into a route", () => {
    const html = page(
      <ThreadView thread={thread} topic="Intégrations et API" signedIn actions={actions} />,
    );
    expect(html).toContain(`href="/fr/routes/new?fromThread=${thread.id}"`);
    expect(html).toContain(fr.reply.accepted);
    expect(html).toContain("Idempotency-Key");
  });

  it("blanks hidden content for other readers", () => {
    const hidden = { ...thread, status: "hidden" as const, content: null, codeText: null };
    const html = page(<ThreadView thread={hidden} topic="" signedIn={false} actions={actions} />);
    expect(html).toContain(fr.hidden.thread);
  });

  it("seeds the route editor with the question, the code and the accepted reply", () => {
    const draft = threadDraft(thread);
    expect(draft).toMatchObject({
      title: thread.title,
      service: "wave",
      country: "SN",
      stack: "laravel",
    });
    expect(draft.content).toContain("Route::post");
    expect(draft.content).toContain("Idempotency-Key");
  });
});
