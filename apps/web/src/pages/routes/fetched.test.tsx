import { render } from "preact-render-to-string";
import { beforeAll, describe, expect, it } from "vitest";
import ui from "../../components/ui/locales/fr.json";
import { setupTestI18n } from "../../i18n/test-i18n";
import api from "../../../../../packages/shared/src/i18n/locales/fr.json";
import { Fetched } from "./Fetched";
import type { Loaded } from "./useApi";

beforeAll(async () => {
  await setupTestI18n("fr");
});

const show = (state: Loaded<string[]>) =>
  render(
    <Fetched api={{ state, reload: () => Promise.resolve() }}>
      {(items) => <p>{items.join(", ")}</p>}
    </Fetched>,
  );

describe("Fetched", () => {
  it("shows a busy skeleton while loading", () => {
    expect(show({ status: "loading" })).toContain('aria-busy="true"');
  });

  it("shows the data once it arrives", () => {
    expect(show({ status: "ready", data: ["Wave", "PI-SPI"] })).toContain("Wave, PI-SPI");
  });

  it("shows the error with a retry", () => {
    const html = show({ status: "error", error: { code: "server_error", message: "Panne." } });
    expect(html).toContain("Panne.");
    expect(html).toContain(ui.retry);
  });

  it("says the resource is missing instead of loading forever", () => {
    const html = show({ status: "notFound" });
    expect(html).toContain(api.errors.not_found);
    expect(html).not.toContain('aria-busy="true"');
  });
});
