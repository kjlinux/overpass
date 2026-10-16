import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { serviceSchema } from "@overpass/shared";
import { z } from "zod";
import type { ToolContext } from "./context.js";
import { readOnly } from "./context.js";
import { countryField } from "./fields.js";
import { dataResult, guarded } from "./result.js";

export function registerListServices(server: McpServer, ctx: ToolContext): void {
  const text = ctx.text.tools.list_services;
  const inputSchema = { country: countryField.optional().describe(text.country) };
  const config = { title: text.title, description: text.description, inputSchema };
  server.registerTool("list_services", { ...config, annotations: readOnly }, ({ country }) =>
    guarded(ctx, async () => {
      const services = await ctx.client.get("/v1/services", z.array(serviceSchema));
      const kept =
        country === undefined
          ? services
          : services.filter((service) => service.countries.includes(country));
      const lines = kept.length === 0 ? [ctx.text.empty] : [];
      return dataResult(ctx, "list_services", lines, { services: kept });
    }),
  );
}
