import { describe, expect, it } from "vitest";
import { editorConfigs, mcpUrl } from "./config";

const token = `ovp_${"b".repeat(43)}`;
const url = "https://overpass.example/mcp?lang=fr";

describe("mcp editor configuration", () => {
  it("points at the /mcp endpoint of the site, in the reader's language", () => {
    expect(mcpUrl("https://overpass.example", "fr")).toBe(url);
  });

  it("gives Claude Code a single http command with the bearer header", () => {
    expect(editorConfigs(url, token).claudeCode).toBe(
      `claude mcp add --transport http overpass "${url}" --header "Authorization: Bearer ${token}"`,
    );
  });

  it("gives Cursor an mcpServers entry with the url and header", () => {
    const parsed = JSON.parse(editorConfigs(url, token).cursor) as unknown;
    expect(parsed).toEqual({
      mcpServers: { overpass: { url, headers: { Authorization: `Bearer ${token}` } } },
    });
  });

  it("gives VS Code an http server entry", () => {
    const parsed = JSON.parse(editorConfigs(url, token).vscode) as unknown;
    expect(parsed).toEqual({
      servers: { overpass: { type: "http", url, headers: { Authorization: `Bearer ${token}` } } },
    });
  });
});
