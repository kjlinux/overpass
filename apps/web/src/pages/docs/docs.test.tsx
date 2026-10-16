import { LocationProvider } from "preact-iso";
import { render } from "preact-render-to-string";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { setupTestI18n } from "../../i18n/test-i18n";
import { ApiReferenceView, DocsPage } from "./index";

beforeAll(async () => {
  await setupTestI18n("fr");
  vi.stubGlobal("location", new URL("https://overpass.example/fr/docs"));
});

const page = () =>
  render(
    <LocationProvider>
      <DocsPage />
    </LocationProvider>,
  );

describe("documentation page", () => {
  it("starts with a three-step quick start that links to the token settings", () => {
    const html = page();
    expect(html).toContain("<h1");
    expect(html.match(/<li[^>]*data-step/g)).toHaveLength(3);
    expect(html).toContain('href="/fr/settings#tokens"');
  });

  it("gives the three editor configurations with a placeholder token", () => {
    const html = page();
    expect(html).toContain("claude mcp add --transport http overpass");
    expect(html).toContain("https://overpass.example/mcp?lang=fr");
    expect(html).toContain("ovp_VOTRE_JETON");
  });

  it("lists the four read-only tools and explains the data block", () => {
    const html = page();
    for (const tool of ["search_routes", "get_route", "list_potholes", "list_services"]) {
      expect(html).toContain(tool);
    }
    expect(html).toContain("&lt;overpass_data>");
  });

  it("walks through a complete example ending in code that cites the route", () => {
    const html = page();
    expect(html).toContain("Wave-Signature");
    expect(html).toContain("fiche Overpass 3f2b8c1e");
  });
});

describe("simulator API reference", () => {
  it("renders each operation with its method, path, parameters and responses", () => {
    const reference = {
      providers: [{ id: "wave", name: "Wave", unofficial: true, docsVersion: "v1" }],
      groups: [
        {
          tag: "Wave",
          operations: [
            {
              method: "POST",
              path: "/v1/sandbox/wave/v1/checkout/sessions",
              summary: "Créer une session",
              parameters: [{ name: "Idempotency-Key", in: "header", required: true }],
              responses: ["200", "400"],
            },
          ],
        },
      ],
    };
    const html = render(<ApiReferenceView reference={reference} />);
    expect(html).toContain("non officiel");
    expect(html).toContain("/v1/sandbox/wave/v1/checkout/sessions");
    expect(html).toContain("Idempotency-Key");
    expect(html).toContain("obligatoire");
    expect(html).toContain("400");
  });
});
