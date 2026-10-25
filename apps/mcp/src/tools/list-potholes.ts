import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { routeDetailSchema, routePageSchema } from "@overpass/shared";
import type { RouteDetail } from "@overpass/shared";
import { format } from "../messages.js";
import type { ToolContext } from "./context.js";
import { readOnly } from "./context.js";
import { countryField, idField, slugField } from "./fields.js";
import { dataResult, failure, guarded, statusLine, withFreshness } from "./result.js";

type Target = {
  routeId?: string | undefined;
  service?: string | undefined;
  country?: string | undefined;
};

function readRoute(ctx: ToolContext, id: string): Promise<RouteDetail> {
  return ctx.client.get(`/v1/routes/${encodeURIComponent(id)}`, routeDetailSchema);
}

/** All MCP traffic shares the server's IP budget on the API, so a call reads few routes. */
const maxRoutes = 10;

/** The API lists only routes with an open pothole, so the cap never hides one behind clean routes. */
async function routesOf(ctx: ToolContext, service: string, country: string) {
  const query = { service, country, potholes: "open", limit: maxRoutes };
  const page = await ctx.client.get("/v1/routes", routePageSchema, query);
  const routes = await Promise.all(page.items.map((item) => readRoute(ctx, item.id)));
  return { routes, truncated: page.nextCursor !== null };
}

function summarise(ctx: ToolContext, route: RouteDetail) {
  const { id, title, service, country, state, lastCheckAt } = route;
  const potholes = route.potholes.filter((pothole) => pothole.status !== "resolved");
  return withFreshness({ id, title, service, country, state, lastCheckAt, potholes }, ctx.now());
}

async function listPotholes(ctx: ToolContext, { routeId, service, country }: Target) {
  if (routeId === undefined && (service === undefined || country === undefined)) {
    return failure(ctx.text, "potholes_target");
  }
  const found =
    routeId === undefined
      ? await routesOf(ctx, service ?? "", country ?? "")
      : { routes: [await readRoute(ctx, routeId)], truncated: false };
  const routes = found.routes.map((route) => summarise(ctx, route));
  const lines = routes.map((route) => statusLine(ctx.text, route));
  if (routes.length === 0) lines.push(ctx.text.empty);
  if (found.truncated) lines.push(format(ctx.text.truncated, { count: maxRoutes }));
  return dataResult(ctx, "list_potholes", lines, { routes, truncated: found.truncated });
}

export function registerListPotholes(server: McpServer, ctx: ToolContext): void {
  const text = ctx.text.tools.list_potholes;
  const inputSchema = {
    routeId: idField.optional().describe(text.routeId),
    service: slugField.optional().describe(text.service),
    country: countryField.optional().describe(text.country),
  };
  const config = { title: text.title, description: text.description, inputSchema };
  server.registerTool("list_potholes", { ...config, annotations: readOnly }, (input) =>
    guarded(ctx, () => listPotholes(ctx, input)),
  );
}
