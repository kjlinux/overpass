import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { routeDetailSchema } from "@overpass/shared";
import type { ToolContext } from "./context.js";
import { readOnly } from "./context.js";
import { idField, languageField } from "./fields.js";
import { dataResult, guarded, statusLine, withFreshness } from "./result.js";

export function registerGetRoute(server: McpServer, ctx: ToolContext): void {
  const text = ctx.text.tools.get_route;
  const inputSchema = {
    id: idField.describe(text.id),
    language: languageField.optional().describe(text.language),
  };
  const config = { title: text.title, description: text.description, inputSchema };
  server.registerTool("get_route", { ...config, annotations: readOnly }, ({ id, language }) =>
    guarded(ctx, async () => {
      const path = `/v1/routes/${encodeURIComponent(id)}`;
      const route = await ctx.client.get(path, routeDetailSchema.omit({ viewer: true }), {
        lang: language,
      });
      const fresh = withFreshness(route, ctx.now());
      return dataResult(ctx, "get_route", [statusLine(ctx.text, fresh)], fresh);
    }),
  );
}
