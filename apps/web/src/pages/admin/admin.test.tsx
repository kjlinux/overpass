import type { Me, QueueItem } from "@overpass/shared";
import { LocationProvider } from "preact-iso";
import { render } from "preact-render-to-string";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { setupTestI18n } from "../../i18n/test-i18n";
import fr from "./locales/fr.json";
import { ContentTab } from "./ContentTab";
import { PagedView } from "./PagedView";
import { AdminScreen, QueueRow, ReasonDialog } from "./index";

beforeAll(async () => {
  await setupTestI18n("fr");
  vi.stubGlobal("location", new URL("/fr/admin", "http://localhost"));
});

const page = (node: preact.ComponentChildren) =>
  render(<LocationProvider>{node}</LocationProvider>);

const me = (role: Me["role"]): Me => ({
  id: "00000000-0000-4000-8000-000000000001",
  email: "awa@example.com",
  handle: "awa",
  country: "SN",
  language: "fr",
  role,
  stacks: [],
  newsletter: false,
  createdAt: "2026-10-01T00:00:00.000Z",
});

const item: QueueItem = {
  kind: "route",
  id: "0f8fad5b-d9cb-469f-a165-70867728950e",
  title: "Encaisser avec Wave",
  excerpt: "Le parcours complet.",
  author: "kofi",
  reports: 2,
  lastReportAt: "2026-10-16T12:00:00.000Z",
  status: "visible",
  path: "/routes/0f8fad5b-d9cb-469f-a165-70867728950e",
};

describe("admin page", () => {
  it("refuses a member in writing", () => {
    const html = page(<AdminScreen me={me("member")} />);
    expect(html).toContain(fr.refused);
    expect(html).not.toContain('role="tablist"');
  });

  it("gives an admin four keyboard tabs, the queue first", () => {
    const html = page(<AdminScreen me={me("admin")} />);
    expect(html).toContain('role="tablist"');
    for (const label of Object.values(fr.tabs)) expect(html).toContain(label);
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain(fr.kindFilter.label);
    expect(html).toContain(fr.stateFilter.open);
    expect(html).toContain(fr.stateFilter.hidden);
    expect(html).not.toContain('href="/fr/blog/write"');
  });
});

describe("content tab", () => {
  it("links the post editor and the newsletter issues", () => {
    const html = page(<ContentTab />);
    expect(html).toContain('href="/fr/blog/write"');
    expect(html).toContain('href="/fr/admin/newsletter"');
  });
});

describe("queue row", () => {
  it("links the content and says how often and when it was reported", () => {
    const html = page(<QueueRow item={item} onAsk={() => undefined} />);
    expect(html).toContain(`href="/fr${item.path}"`);
    expect(html).toContain("2 signalements");
    expect(html).toContain("16 oct. 2026");
    expect(html).toContain(fr.decision.hide);
    expect(html).toContain(fr.decision.restore);
  });

  it("says a hidden itinerary has no report", () => {
    const hidden = { ...item, status: "hidden" as const, reports: 0, lastReportAt: null };
    const html = page(<QueueRow item={hidden} onAsk={() => undefined} />);
    expect(html).toContain(fr.queue.noReport);
    expect(html).not.toContain(`>${fr.decision.hide}<`);
  });
});

describe("paged view", () => {
  const empty = { icon: () => null, title: "Vide", description: "Rien ici." } as never;
  const base = { next: null, error: undefined };

  it("shows a skeleton, an empty state, then the rows with Charger plus", () => {
    const loading = { ...base, items: [], phase: "loading" as const };
    expect(
      page(
        <PagedView state={loading} more={() => undefined} empty={empty}>
          {() => null}
        </PagedView>,
      ),
    ).toContain('aria-busy="true"');
    const none = { ...base, items: [], phase: "ready" as const };
    expect(
      page(
        <PagedView state={none} more={() => undefined} empty={empty}>
          {() => null}
        </PagedView>,
      ),
    ).toContain("Rien ici.");
    const rows = { ...base, items: [1], next: "c", phase: "ready" as const };
    const html = page(
      <PagedView state={rows} more={() => undefined} empty={empty}>
        {(items) => <p>{items.length}</p>}
      </PagedView>,
    );
    expect(html).toContain(fr.more);
  });

  it("writes the error when the first page fails", () => {
    const failed = {
      ...base,
      items: [],
      phase: "ready" as const,
      error: { code: "admin_only", message: "Réservé." },
    };
    expect(
      page(
        <PagedView state={failed} more={() => undefined} empty={empty}>
          {() => null}
        </PagedView>,
      ),
    ).toContain('role="alert"');
  });
});

describe("reason dialog", () => {
  it("labels the reason field and uses the danger button for a suspension", () => {
    const html = page(
      <ReasonDialog
        open={false}
        title="Suspendre awa ?"
        text="Ses sessions s'arrêtent."
        confirmLabel={fr.accounts.suspend}
        destructive
        reason={{ rule: "required", label: fr.accounts.reason, help: fr.accounts.reasonHelp }}
        busy={false}
        error={undefined}
        onConfirm={() => undefined}
        onCancel={() => undefined}
      />,
    );
    expect(html).toContain(fr.accounts.reason);
    expect(html).toContain("aria-labelledby");
    expect(html).toContain("bg-danger");
  });
});
