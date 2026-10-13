import type { RouteDetail } from "@overpass/shared";
import { LocationProvider } from "preact-iso";
import { render } from "preact-render-to-string";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { setupTestI18n } from "../../i18n/test-i18n";
import { detail } from "./fixtures";
import fr from "./locales/fr.json";
import { RouteView, weeksWithChecks } from "./index";

beforeAll(async () => {
  await setupTestI18n("fr");
  vi.stubGlobal("location", new URL(`/fr/routes/${detail.id}`, "http://localhost"));
});

const noop = () => Promise.resolve(undefined);
const view = (route: RouteDetail) =>
  render(
    <LocationProvider>
      <RouteView
        route={route}
        now={new Date("2026-10-13T12:00:00Z")}
        actions={{ verify: noop, report: noop, setStatus: noop, remove: noop }}
      />
    </LocationProvider>,
  );

describe("RouteView content", () => {
  it("renders the Markdown in a 72 character column with copyable code", () => {
    const html = view(detail);
    expect(html).toContain("max-w-prose");
    expect(html).toContain('<h2 id="s-prerequis"');
    expect(html).toContain("abort_unless");
    expect(html).toContain("aria-live");
  });

  it("shows one state badge only, explained in words", () => {
    const html = view(detail);
    expect(html.match(/Voie libre/g)).toHaveLength(1);
    expect(html).toContain(fr.detail.stateHeading);
  });

  it("lists the dated checks and the potholes with their status", () => {
    const html = view(detail);
    expect(html).toContain("9 oct. 2026");
    expect(html).toContain("kofi-dev");
    expect(html).toContain(fr.potholes.status.confirmed);
    expect(html).toContain("deux fois");
  });

  it("warns when the requested language fell back to another", () => {
    expect(view({ ...detail, fallback: true })).toContain('role="note"');
  });
});

describe("RouteView actions", () => {
  it("offers Tester and Ça marche chez moi to a member", () => {
    const html = view(detail);
    expect(html).toContain(fr.detail.test);
    expect(html).toContain(fr.detail.verify);
  });

  it("keeps the verify button focusable but disabled for the author, with the reason", () => {
    const html = view({
      ...detail,
      viewer: { isAuthor: true, eligibility: "own_route", nextCheckAt: null },
    });
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain(fr.detail.verifyOwn);
    expect(html).toContain(fr.detail.edit);
  });

  it("ties each moderation button to the pothole it acts on", () => {
    const html = view({
      ...detail,
      potholes: [{ ...detail.potholes[0]!, status: "open" }],
      viewer: { isAuthor: true, eligibility: "own_route", nextCheckAt: null },
    });
    expect(html).toContain('id="pothole-p1"');
    expect(html.match(/aria-describedby="pothole-p1"/g)).toHaveLength(2);
  });

  it("gives the date of the next possible check", () => {
    const html = view({
      ...detail,
      viewer: { isAuthor: false, eligibility: "too_soon", nextCheckAt: "2026-11-08T12:00:00.000Z" },
    });
    expect(html).toContain("8 nov. 2026");
  });

  it("sends a visitor to sign in before verifying", () => {
    const html = view({
      ...detail,
      viewer: { isAuthor: false, eligibility: "anonymous", nextCheckAt: null },
    });
    expect(html).toContain("/fr/sign-in?next=");
  });
});

describe("weeksWithChecks", () => {
  it("marks the weeks of the last 90 days that hold a check", () => {
    const weeks = weeksWithChecks(
      ["2026-10-09T12:00:00Z", "2026-08-14T12:00:00Z", "2026-06-02T12:00:00Z"],
      new Date("2026-10-13T12:00:00Z"),
    );
    expect(weeks).toHaveLength(13);
    expect(weeks[12]).toBe(true);
    expect(weeks.filter(Boolean)).toHaveLength(2);
  });
});
