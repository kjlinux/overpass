import type { RouteDetail } from "@overpass/shared";
import { LocationProvider } from "preact-iso";
import { render } from "preact-render-to-string";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { setupTestI18n } from "../../i18n/test-i18n";
import { detail } from "./fixtures";
import { mayFlag } from "./FlagRoute";
import fr from "./locales/fr.json";
import { RouteView } from "./index";

beforeAll(async () => {
  await setupTestI18n("fr");
  vi.stubGlobal("location", new URL(`/fr/routes/${detail.id}`, "http://localhost"));
});

const noop = () => Promise.resolve(undefined);
const actions = { verify: noop, report: noop, setStatus: noop, remove: noop, flag: noop };
const view = (route: RouteDetail) =>
  render(
    <LocationProvider>
      <RouteView route={route} now={new Date("2026-10-13T12:00:00Z")} actions={actions} />
    </LocationProvider>,
  );
const author = { isAuthor: true, eligibility: "own_route", nextCheckAt: null } as const;
const visitor = { isAuthor: false, eligibility: "anonymous", nextCheckAt: null } as const;

describe("reporting an itinerary", () => {
  it("offers the report to a signed-in member who is not the author", () => {
    expect(mayFlag(detail)).toBe(true);
    const html = view(detail);
    expect(html).toContain(fr.flag.action);
    expect(html).toContain(fr.flag.reason);
  });

  it("hides it from the author and from visitors", () => {
    expect(mayFlag({ ...detail, viewer: author })).toBe(false);
    expect(mayFlag({ ...detail, viewer: visitor })).toBe(false);
    expect(view({ ...detail, viewer: visitor })).not.toContain(fr.flag.action);
  });
});

describe("hidden itinerary notice", () => {
  it("tells the author and admins that moderation hid the sheet", () => {
    const html = view({ ...detail, moderation: "hidden", viewer: author });
    expect(html).toContain(fr.hidden.title);
    expect(html).toContain('role="note"');
  });

  it("says nothing on a visible sheet", () => {
    expect(view({ ...detail, moderation: "visible" })).not.toContain(fr.hidden.title);
  });
});
