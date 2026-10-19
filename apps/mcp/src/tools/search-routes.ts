import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { routePageSchema } from "@overpass/shared";
import { z } from "zod";
import type { ToolContext } from "./context.js";
import { readOnly } from "./context.js";
import { countryField, languageField, slugField } from "./fields.js";
import { dataResult, guarded, statusLine, withFreshness } from "./result.js";

export function registerSearchRoutes(server: McpServer, ctx: ToolContext): void {
  const text = ctx.text.tools.search_routes;
  const inputSchema = {
    query: z.string().max(200).optional().describe(text.query),
    service: slugField.optional().describe(text.service),
    country: countryField.optional().describe(text.country),
    stack: slugField.optional().describe(text.stack),
    language: languageField.optional().describe(text.language),
    cursor: z.string().max(400).optional().describe(text.cursor),
  };
  const config = { title: text.title, description: text.description, inputSchema };
  server.registerTool("search_routes", { ...config, annotations: readOnly }, (input) =>
    guarded(ctx, async () => {
      const { query, ...filters } = input;
      const page = await ctx.client.get("/v1/routes", routePageSchema, { q: query, ...filters });
      const items = page.items.map((item) => withFreshness(item, ctx.now()));
      const lines = items.map((item) => statusLine(ctx.text, item));
      return dataResult(ctx, "search_routes", lines, { items, nextCursor: page.nextCursor });
    }),
  );
}
