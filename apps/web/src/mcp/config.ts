import type { Language } from "@overpass/shared";

export type EditorConfigs = { claudeCode: string; cursor: string; vscode: string };

/** The MCP endpoint served beside the site; the language sets the tools' own wording. */
export function mcpUrl(origin: string, language: Language): string {
  return `${origin}/mcp?lang=${language}`;
}

/** Ready-to-paste configuration for the three editors, from their public documentation. */
export function editorConfigs(url: string, token: string): EditorConfigs {
  const headers = { Authorization: `Bearer ${token}` };
  const json = (value: unknown) => JSON.stringify(value, null, 2);
  return {
    claudeCode: `claude mcp add --transport http overpass "${url}" --header "Authorization: Bearer ${token}"`,
    cursor: json({ mcpServers: { overpass: { url, headers } } }),
    vscode: json({ servers: { overpass: { type: "http", url, headers } } }),
  };
}
