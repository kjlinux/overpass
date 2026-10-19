import { describe, expect, it } from "vitest";
import {
  buildShareTags,
  escapeHtml,
  injectShareTags,
  pageTitle,
  plainSummary,
  renderShareTags,
  shareMessagesSchema,
} from "./index.js";

const document = {
  title: "Wave & Laravel",
  description: "Le parcours complet.",
  url: "https://overpass.africa/fr/routes/1",
  type: "article" as const,
  language: "fr",
  origin: "https://overpass.africa",
  siteName: "Overpass",
  alternates: [
    { language: "fr", url: "https://overpass.africa/fr/routes/1" },
    { language: "en", url: "https://overpass.africa/en/routes/2" },
  ],
};

describe("share tags", () => {
  it("renders title, description, canonical, hreflang, Open Graph and Twitter tags", () => {
    const html = renderShareTags(buildShareTags(document));
    expect(html).toContain("<title>Wave &amp; Laravel</title>");
    expect(html).toContain('rel="canonical" href="https://overpass.africa/fr/routes/1"');
    expect(html).toContain('hreflang="en" href="https://overpass.africa/en/routes/2"');
    expect(html).toContain('hreflang="x-default" href="https://overpass.africa/fr/routes/1"');
    expect(html).toContain('property="og:type" content="article"');
    expect(html).toContain('content="https://overpass.africa/share/overpass-fr.png"');
    expect(html).toContain('property="og:locale:alternate" content="en_US"');
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
  });

  it("leaves out hreflang links when the content exists in one language only", () => {
    const html = renderShareTags(buildShareTags({ ...document, alternates: [] }));
    expect(html).not.toContain("hreflang");
    expect(html).not.toContain("og:locale:alternate");
  });

  it("escapes quotes, markup and ampersands from member titles", () => {
    expect(escapeHtml(`"><script>alert('x')</script>&`)).toBe(
      "&quot;&gt;&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;&amp;",
    );
  });
});

describe("shell injection", () => {
  it("fills the placeholder and the page language, keeping $ sequences literal", () => {
    const shell = '<html lang="fr"><head><!--share-tags--></head></html>';
    const html = injectShareTags(shell, "en", [{ kind: "title", content: "$& $1 cost" }]);
    expect(html).toBe('<html lang="en"><head><title>$&amp; $1 cost</title></head></html>');
  });
});

describe("share texts", () => {
  it("validates a locale file and fills the title pattern", () => {
    const messages = shareMessagesSchema.parse({
      site: { name: "Overpass", promise: "p", title: "t", description: "d" },
      titleTemplate: "{{page}} · Overpass",
      pages: {},
    });
    expect(pageTitle(messages, "Tarifs")).toBe("Tarifs · Overpass");
  });
});

describe("plain summary", () => {
  it("takes the first paragraph after the headings, without Markdown", () => {
    const markdown = "## Prérequis\n\nUn **compte** [Wave](https://wave.com) et `npm i`.\n\nSuite.";
    expect(plainSummary(markdown)).toBe("Un compte Wave et npm i.");
  });

  it("skips code blocks, lists markers and quotes", () => {
    expect(plainSummary("```js\nconst a = 1;\n```\n\n> - Une étape")).toBe("Une étape");
  });

  it("cuts at a word boundary near 160 characters with an ellipsis", () => {
    const long = `${"mot ".repeat(60)}fin`;
    const summary = plainSummary(long);
    expect(summary.length).toBeLessThanOrEqual(160);
    expect(summary.endsWith("mot…")).toBe(true);
  });

  it("keeps emoji whole when cutting", () => {
    const summary = plainSummary("🚀 ".repeat(100), 20);
    expect(summary).toMatch(/^(🚀 )*🚀…$/u);
  });
});
