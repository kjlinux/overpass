import type { CreatedToken } from "@overpass/shared";
import { render } from "preact-render-to-string";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { setupTestI18n } from "../../i18n/test-i18n";
import { CreatedPanel } from "./TokenCreate";

const created = (usage: "mcp" | "api"): CreatedToken => ({
  id: crypto.randomUUID(),
  name: "Portable",
  usage,
  createdAt: "2026-10-16T12:00:00Z",
  lastUsedAt: null,
  token: `ovp_${"d".repeat(43)}`,
});

beforeAll(async () => {
  await setupTestI18n("fr");
  vi.stubGlobal("location", new URL("https://overpass.example/fr/settings"));
});

describe("token created panel", () => {
  it("shows the editor configuration with the new MCP token", () => {
    const html = render(<CreatedPanel token={created("mcp")} onDone={() => undefined} />);
    expect(html).toContain("Configurer votre éditeur");
    expect(html).toContain("https://overpass.example/mcp?lang=fr");
    expect(html).toContain(`Bearer ${created("mcp").token}`);
  });

  it("shows only the token for an API key", () => {
    const html = render(<CreatedPanel token={created("api")} onDone={() => undefined} />);
    expect(html).not.toContain("mcp?lang=");
  });
});
