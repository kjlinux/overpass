import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { routeTemplate } from "@overpass/shared";
import type { Language, StackId } from "@overpass/shared";

export type PlannedRoute = { service: string; country: string; stack: StackId; language: Language };

/** The ten itineraries the team plans to write from production experience; codes only. */
export const plannedRoutes: readonly PlannedRoute[] = [
  { service: "orange-money", country: "CI", stack: "laravel", language: "fr" },
  { service: "wave", country: "SN", stack: "laravel", language: "fr" },
  { service: "wave", country: "CI", stack: "nodejs", language: "fr" },
  { service: "pi-spi", country: "SN", stack: "nodejs", language: "fr" },
  { service: "paydunya", country: "SN", stack: "php", language: "fr" },
  { service: "paydunya", country: "CI", stack: "django", language: "fr" },
  { service: "moov-money", country: "BJ", stack: "php", language: "fr" },
  { service: "orange-money", country: "SN", stack: "nextjs", language: "fr" },
  { service: "cinetpay", country: "CI", stack: "symfony", language: "fr" },
  { service: "wave", country: "SN", stack: "flutter", language: "fr" },
];

export type TemplateFile = { name: string; language: Language; content: string };

/** One Markdown file per planned itinerary: editor fields up front, empty sections below. */
export function routeTemplateFiles(): TemplateFile[] {
  return plannedRoutes.map((route, index) => ({
    name: `${String(index + 1).padStart(2, "0")}-${route.service}-${route.country.toLowerCase()}-${route.stack}.md`,
    language: route.language,
    content: [
      "---",
      'title: ""',
      `service: ${route.service}`,
      `country: ${route.country}`,
      `stack: ${route.stack}`,
      `language: ${route.language}`,
      "---",
      "",
      routeTemplate(route.language),
    ].join("\n"),
  }));
}

/** Writes the missing files only, so a second run never erases what the team has written. */
export function writeRouteTemplates(directory: string): number {
  mkdirSync(directory, { recursive: true });
  let written = 0;
  for (const file of routeTemplateFiles()) {
    const path = join(directory, file.name);
    if (existsSync(path)) continue;
    writeFileSync(path, file.content, { flag: "wx" });
    written += 1;
  }
  return written;
}
