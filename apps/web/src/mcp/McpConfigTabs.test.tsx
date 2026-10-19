import { render } from "preact-render-to-string";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { setupTestI18n } from "../i18n/test-i18n";
import { McpConfigTabs } from "./index";

const token = `ovp_${"c".repeat(43)}`;

beforeAll(async () => {
  await setupTestI18n("fr");
  vi.stubGlobal("location", new URL("https://overpass.example/fr/docs"));
});

describe("McpConfigTabs", () => {
  it("renders one keyboard tab per editor with the token in each configuration", () => {
    const html = render(<McpConfigTabs token={token} />);
    expect(html.match(/role="tab"/g)).toHaveLength(3);
    expect(html).toContain("https://overpass.example/mcp?lang=fr");
    expect(html.split(token).length - 1).toBe(3);
    expect(html).toContain("ne la versionnez pas");
  });

  it("shows a placeholder when no token is given", () => {
    const html = render(<McpConfigTabs />);
    expect(html).toContain("Bearer ovp_VOTRE_JETON");
  });
});
