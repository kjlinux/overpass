import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "../../db/client.js";
import { moderateRoute, registerAdmin } from "../../testing-admin.js";
import { writePost } from "../../testing-blog.js";
import { call, publishRoute, testClock } from "../../testing-routes.js";
import { createTestApp, registerAccount, webOrigin } from "../../testing.js";

const site = (title: string) => ({
  site: { name: "Overpass", promise: "p", title, description: `${title}, description` },
  titleTemplate: "{{page}} · Overpass",
  pages: {},
});

let dist: string;
let app: FastifyInstance;
let db: Database;
let close: () => Promise<void>;
let author: string;

beforeAll(() => {
  dist = mkdtempSync(join(tmpdir(), "overpass-dist-"));
  mkdirSync(join(dist, "share"));
  const shell =
    '<html lang="fr"><head><!--share-tags--></head><body><div id="root"></div></body></html>';
  writeFileSync(join(dist, "share/shell.html"), shell);
  const messages = { fr: site("Site FR"), en: site("Site EN") };
  writeFileSync(join(dist, "share/messages.json"), JSON.stringify(messages));
});
afterAll(() => {
  rmSync(dist, { recursive: true, force: true });
});

beforeEach(async () => {
  const config = { WEB_DIST_DIR: dist };
  ({ app, db, close } = await createTestApp({ now: testClock().now, config }));
  author = await registerAccount(app, "author@example.com");
});
afterEach(() => close());

const get = (url: string) => app.inject({ method: "GET", url });
const metaOf = (html: string, key: string) =>
  new RegExp(`(?:name|property)="${key}" content="([^"]*)"`).exec(html)?.[1];

describe("itinerary share page", () => {
  it("serves the shell with the itinerary title, a plain summary and article tags", async () => {
    const id = await publishRoute(app, author);
    const response = await get(`/fr/routes/${id}`);
    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.headers["cache-control"]).toBe("public, max-age=300");
    const html = response.body;
    expect(html).toContain('<div id="root">');
    expect(html).toContain("<title>Encaisser un paiement Wave Checkout depuis Laravel</title>");
    expect(metaOf(html, "og:description")).toBe("Un compte marchand Wave et des webhooks signés.");
    expect(metaOf(html, "og:type")).toBe("article");
    expect(metaOf(html, "og:image")).toBe(`${webOrigin}/share/overpass-fr.png`);
    expect(html).toContain(`rel="canonical" href="${webOrigin}/fr/routes/${id}"`);
  });

  it("links only the languages the itinerary exists in", async () => {
    const fr = await publishRoute(app, author);
    const english = { language: "en", title: "Collect a Wave Checkout payment from Laravel" };
    const en = await publishRoute(app, author, { ...english, translationOf: fr });
    const html = (await get(`/en/routes/${en}`)).body;
    expect(html).toContain('<html lang="en"');
    expect(html).toContain(`hreflang="fr" href="${webOrigin}/fr/routes/${fr}"`);
    expect(html).toContain(`hreflang="en" href="${webOrigin}/en/routes/${en}"`);
    expect(metaOf(html, "og:image")).toBe(`${webOrigin}/share/overpass-en.png`);
  });

  it("escapes quotes, markup, ampersands and keeps emoji in member titles", async () => {
    const title = `Wave "rapide" <script>alert(1)</script> & 🚀 test`;
    const id = await publishRoute(app, author, { title });
    const html = (await get(`/fr/routes/${id}`)).body;
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain(
      "Wave &quot;rapide&quot; &lt;script&gt;alert(1)&lt;/script&gt; &amp; 🚀 test",
    );
  });

  it("never leaks a hidden, deleted or unknown itinerary", async () => {
    const hidden = await publishRoute(app, author, { title: "Un titre que la modération cache" });
    const removed = await publishRoute(app, author, { title: "Un titre supprimé par son auteur" });
    const admin = await registerAdmin(app, db, "admin@example.com");
    await moderateRoute(app, admin, hidden, "hide");
    await call(app, "DELETE", `/v1/routes/${removed}`, { cookie: author });
    const unknown = "00000000-0000-4000-8000-000000000000";
    for (const id of [hidden, removed, unknown, "not-a-uuid"]) {
      const response = await get(`/fr/routes/${id}`);
      expect(response.statusCode).toBe(200);
      expect(response.body).toContain("<title>Site FR</title>");
      expect(metaOf(response.body, "og:type")).toBe("website");
      expect(response.body).not.toMatch(/la modération cache|supprimé par son auteur/);
    }
  });
});

describe("article share page", () => {
  it("uses the post title and its excerpt", async () => {
    const { slug } = await writePost(app, author, { summary: "Le **parcours** complet." });
    const html = (await get(`/fr/blog/${slug}`)).body;
    expect(html).toContain("<title>Encaisser avec Wave depuis Laravel</title>");
    expect(metaOf(html, "description")).toBe("Le parcours complet.");
    expect(metaOf(html, "og:type")).toBe("article");
  });

  it("serves generic tags for drafts, scheduled posts and other blog paths", async () => {
    const draft = await writePost(app, author, {
      title: "Un brouillon encore privé",
      status: "draft",
    });
    const later = await writePost(app, author, { title: "Un article programmé plus tard" });
    await db.execute(
      sql`update posts set published_at = '2030-01-01T00:00:00Z' where id = ${later.id}`,
    );
    for (const path of [draft.slug, later.slug, "me", "@someone", "unknown-slug"]) {
      const response = await get(`/fr/blog/${path}`);
      expect(response.statusCode).toBe(200);
      expect(response.body).toContain("<title>Site FR</title>");
      expect(response.body).not.toMatch(/Un brouillon encore privé|Un article programmé/);
    }
  });
});

describe("mounting", () => {
  it("leaves the API unchanged when no web build is configured", async () => {
    const bare = await createTestApp();
    const response = await bare.app.inject({ method: "GET", url: "/fr/blog/some-post" });
    expect(response.statusCode).toBe(404);
    await bare.close();
  });
});

describe("language prefix", () => {
  it("answers 404 for an unsupported language, as the API does today", async () => {
    const id = await publishRoute(app, author);
    expect((await get(`/de/routes/${id}`)).statusCode).toBe(404);
    expect((await get("/xx/blog/some-post")).statusCode).toBe(404);
  });
});
