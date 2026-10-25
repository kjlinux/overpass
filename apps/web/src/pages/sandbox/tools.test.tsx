import { LocationProvider } from "preact-iso";
import { render } from "preact-render-to-string";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { setupTestI18n } from "../../i18n/test-i18n";
import { DocsPage } from "../docs";
import { ToolsSection } from "./index";

beforeAll(async () => {
  await setupTestI18n("fr");
  vi.stubGlobal("location", new URL("https://overpass.example/fr/sandbox"));
});

const tools = () =>
  render(
    <LocationProvider>
      <ToolsSection />
    </LocationProvider>,
  );

describe("tools section of the simulator", () => {
  it("anchors two numbered guides under one heading", () => {
    const html = tools();
    expect(html).toContain('id="sandbox-tools"');
    expect(html.match(/<ol/g)).toHaveLength(2);
    expect(html.match(/data-step="cli-/g)).toHaveLength(4);
    expect(html.match(/data-step="mcp-/g)).toHaveLength(3);
  });

  it("gives the overpass-cli command with a placeholder key", () => {
    const html = tools();
    expect(html).toContain("npx overpass-cli listen");
    expect(html).toContain("--key ovp_test_...");
    expect(html).toContain("--api https://overpass.example");
  });

  it("links the MCP guide to the token settings and shows the editor configurations", () => {
    const html = tools();
    expect(html).toContain('href="/fr/settings#tokens"');
    expect(html).toContain("claude mcp add --transport http overpass");
    expect(html).toContain("ovp_VOTRE_JETON");
  });

  it("is reached from the documentation page", () => {
    const html = render(
      <LocationProvider>
        <DocsPage />
      </LocationProvider>,
    );
    expect(html).toContain('href="/fr/sandbox#sandbox-tools"');
  });
});
