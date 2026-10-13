import { LocationProvider } from "preact-iso";
import { render } from "preact-render-to-string";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { setupTestI18n } from "../../i18n/test-i18n";
import { summary } from "../routes/fixtures";
import fr from "./locales/fr.json";
import { MyChecksList, MyRoutesList } from "./index";

beforeAll(async () => {
  await setupTestI18n("fr");
  vi.stubGlobal("location", new URL("/fr/dashboard", "http://localhost"));
});

const page = (node: preact.ComponentChildren) =>
  render(<LocationProvider>{node}</LocationProvider>);

describe("my itineraries", () => {
  it("lists each itinerary with its computed state and a link to edit it", () => {
    const html = page(<MyRoutesList routes={[summary]} />);
    expect(html).toContain(summary.title);
    expect(html).toContain("Voie libre");
    expect(html).toContain(`href="/fr/routes/${summary.id}/edit"`);
  });

  it("invites to write the first itinerary when there is none", () => {
    const html = page(<MyRoutesList routes={[]} />);
    expect(html).toContain(fr.routes.emptyTitle);
    expect(html).toContain('href="/fr/routes/new"');
  });
});

describe("my checks", () => {
  it("lists each dated check with the itinerary it confirms", () => {
    const check = {
      id: "c1",
      country: "SN",
      environment: "production" as const,
      checkedAt: "2026-10-09T12:00:00.000Z",
      route: { id: summary.id, title: summary.title },
    };
    const html = page(<MyChecksList checks={[check]} />);
    expect(html).toContain("9 oct. 2026");
    expect(html).toContain("Sénégal");
    expect(html).toContain(`href="/fr/routes/${summary.id}"`);
  });

  it("invites to browse when nothing was checked yet", () => {
    expect(page(<MyChecksList checks={[]} />)).toContain(fr.checks.emptyTitle);
  });
});
