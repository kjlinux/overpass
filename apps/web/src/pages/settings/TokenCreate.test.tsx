import type { CreatedToken } from "@overpass/shared";
import { render } from "preact-render-to-string";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { setupTestI18n } from "../../i18n/test-i18n";
import { CreatedPanel } from "./TokenCreate";
import { TokenList } from "./TokenList";

const created = (usage: "mcp" | "api"): CreatedToken => ({
  id: crypto.randomUUID(),
  name: "Portable",
  usage,
  createdAt: "2026-10-16T12:00:00Z",
  lastUsedAt: null,
  expiresAt: "2027-01-14T12:00:00Z",
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

describe("token expiry", () => {
  it("tells the date the new token stops working", () => {
    const html = render(<CreatedPanel token={created("api")} onDone={() => undefined} />);
    expect(html).toContain("Expire le 14 janv. 2027");
  });

  it("lists the expiry date of every active token", () => {
    const html = render(<TokenList tokens={[created("mcp")]} onRevoke={() => undefined} />);
    expect(html).toContain("Expire le");
    expect(html).toContain("14 janv. 2027");
  });
});
