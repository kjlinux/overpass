import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { routeTemplate, stackIds } from "@overpass/shared";
import { describe, expect, it } from "vitest";
import { plannedRoutes, routeTemplateFiles, writeRouteTemplates } from "./route-templates.js";

const seededServices = ["wave", "cinetpay", "pi-spi", "paydunya", "orange-money", "moov-money"];

describe("route templates", () => {
  it("plans ten distinct itineraries on seeded services and known stacks", () => {
    expect(plannedRoutes).toHaveLength(10);
    const keys = plannedRoutes.map((route) => `${route.service}/${route.country}/${route.stack}`);
    expect(new Set(keys).size).toBe(10);
    for (const route of plannedRoutes) {
      expect(seededServices).toContain(route.service);
      expect(stackIds).toContain(route.stack);
      expect(route.country).toMatch(/^[A-Z]{2}$/);
    }
  });

  it("holds only the metadata and the empty sections, never written content", () => {
    for (const file of routeTemplateFiles()) {
      expect(file.content).toContain('title: ""');
      expect(file.content.endsWith(routeTemplate(file.language))).toBe(true);
    }
  });

  it("writes one file per itinerary and never overwrites the team's work", () => {
    const directory = mkdtempSync(join(tmpdir(), "overpass-templates-"));
    expect(writeRouteTemplates(directory)).toBe(10);
    const first = readdirSync(directory).sort()[0] ?? "";
    writeFileSync(join(directory, first), "work in progress");
    expect(writeRouteTemplates(directory)).toBe(0);
    expect(readFileSync(join(directory, first), "utf8")).toBe("work in progress");
  });
});
