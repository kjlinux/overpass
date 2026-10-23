import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { test } from "@playwright/test";
import type { Browser, BrowserContext, Page } from "@playwright/test";
import { resetRateLimits } from "./admin.js";
import { publishRoute } from "./itineraries.js";
import { stampOf } from "./itineraries.js";
import { handleOf, newMember } from "./members.js";

type StorageState = Awaited<ReturnType<BrowserContext["storageState"]>>;

/** What the page lists need from the database: one itinerary, one member and their session. */
export type Site = { routePath: string; handle: string; session: StorageState };

/** Public pages from LanguageShell and contentRoutes, with :id and :handle filled by the site. */
export const publicRoutes = [
  "/",
  "/sign-up",
  "/sign-in",
  "/forgot-password",
  "/routes",
  "/routes/:id",
  "/sandbox",
  "/sandbox/demo",
  "/discussions",
  "/ranking",
  "/blog",
  "/newsletter",
  "/docs",
  "/pricing",
  "/about",
  "/legal",
  "/privacy",
  "/simulator-requests",
  "/members/:handle",
  "/no-such-page",
];

/** Replaces the placeholders of a listed route with the site's itinerary and member. */
export function resolveRoute(route: string, site: Site): string {
  return route.replace("/routes/:id", site.routePath).replace(":handle", site.handle);
}

export const memberRoutes = [
  "/dashboard",
  "/settings",
  "/routes/new",
  "/discussions/new",
  "/blog/write",
];

/** Signs one member up and publishes one itinerary, so every page has content to show. */
export async function prepareSite(browser: Browser, name: string): Promise<Site> {
  await resetRateLimits();
  const page = await newMember(browser, name);
  const url = await publishRoute(page, `Wave pour l'audit ${name}`);
  const routePath = new URL(url).pathname.replace(/^\/(fr|en)/, "");
  const site = {
    routePath,
    handle: await handleOf(page),
    session: await page.context().storageState(),
  };
  await page.context().close();
  return site;
}

/** A failed test restarts its worker: the site is kept on disk so the next worker reuses it. */
export async function sharedSite(browser: Browser, prefix: string): Promise<Site> {
  const project = test.info().project.name;
  const file = resolve(`test-results/site-${prefix}-${project}.json`);
  const saved = await readFile(file, "utf8").catch(() => undefined);
  if (saved !== undefined) return JSON.parse(saved) as Site;
  const site = await prepareSite(browser, `${prefix}-${stampOf(project)}`);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(site));
  return site;
}

/** Opens a page and waits for its main heading and its data, in the light or the dark theme. */
export async function openPage(
  browser: Browser,
  url: string,
  options: { dark: boolean; session?: StorageState },
): Promise<Page> {
  const context = await browser.newContext(
    options.session === undefined ? {} : { storageState: options.session },
  );
  await context.addInitScript(
    (theme) => {
      localStorage.setItem("overpass-theme", theme);
    },
    options.dark ? "dark" : "light",
  );
  const page = await context.newPage();
  await page.goto(url);
  await page.locator("main h1").first().waitFor();
  await page.waitForLoadState("networkidle");
  return page;
}
