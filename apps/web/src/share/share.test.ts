import { describe, expect, it } from "vitest";
import en from "./locales/en.json";
import fr from "./locales/fr.json";
import { prerenderedHtml } from "./plugin";
import { applyShareTags } from "./useShareTags";
import { renderShareTags, shareMessagesSchema } from "@overpass/shared";
import { pageOfPath, publicPages, shareTags } from "./index";

const messages = shareMessagesSchema.parse(fr);
const base = { origin: "https://overpass.africa", languages: ["fr", "en"], messages };

type FakeElement = { tag: string; attributes: Map<string, string>; removed: boolean };

/** Just enough of a Document for applyShareTags: the tests run without a DOM. */
function fakeDocument() {
  const children: FakeElement[] = [];
  const toElement = (item: FakeElement) => ({
    setAttribute: (name: string, value: string) => item.attributes.set(name, value),
    getAttribute: (name: string) => item.attributes.get(name) ?? null,
    remove: () => {
      item.removed = true;
    },
  });
  const live = () => children.filter((item) => !item.removed);
  const head = {
    querySelectorAll: () =>
      live()
        .filter((item) => item.attributes.has("data-share"))
        .map(toElement),
    append: () => undefined,
  };
  const doc = {
    title: "",
    head,
    createElement: (tag: string) => {
      const item = { tag, attributes: new Map<string, string>(), removed: false };
      children.push(item);
      return toElement(item);
    },
  };
  return { doc, live };
}

describe("share tags", () => {
  it("gives every public page a title and description in both languages", () => {
    for (const json of [fr, en]) {
      const parsed = shareMessagesSchema.parse(json);
      for (const page of Object.keys(publicPages)) expect(parsed.pages[page], page).toBeDefined();
    }
  });

  it("builds title, canonical, hreflang, Open Graph and Twitter tags for a page", () => {
    const html = renderShareTags(
      shareTags({ ...base, path: "/pricing", language: "fr", page: "pricing" }),
    );
    expect(html).toContain("<title>Tarifs · Overpass</title>");
    expect(html).toContain('rel="canonical" href="https://overpass.africa/fr/pricing"');
    expect(html).toContain('hreflang="en" href="https://overpass.africa/en/pricing"');
    expect(html).toContain('hreflang="x-default" href="https://overpass.africa/fr/pricing"');
    expect(html).toContain(
      'property="og:image" content="https://overpass.africa/share/overpass-fr.png"',
    );
    expect(html).toContain('property="og:type" content="website"');
    expect(html).toContain('property="og:locale" content="fr_FR"');
    expect(html).toContain('property="og:locale:alternate" content="en_US"');
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
  });

  it("falls back to the site-wide texts on a dynamic page and escapes HTML", () => {
    const unsafe = { ...messages, site: { ...messages.site, title: 'A <b>"x"</b>' } };
    const input = { ...base, messages: unsafe, path: "/routes/42", language: "fr" };
    const html = renderShareTags(shareTags({ ...input, page: undefined }));
    expect(html).toContain("<title>A &lt;b&gt;&quot;x&quot;&lt;/b&gt;</title>");
    expect(html).toContain('href="https://overpass.africa/fr/routes/42"');
  });

  it("maps paths to static pages, ignoring a trailing slash", () => {
    expect(pageOfPath("/")).toBe("home");
    expect(pageOfPath("/privacy/")).toBe("privacy");
    expect(pageOfPath("/routes/42")).toBeUndefined();
  });

  it("pre-renders the built page with the tags and the language of the URL", () => {
    const template = '<html lang="fr"><head><!--share-tags--></head></html>';
    const english = shareMessagesSchema.parse(en);
    const html = prerenderedHtml(template, {
      ...base,
      language: "en",
      page: "about",
      messages: english,
    });
    expect(html).toContain('<html lang="en">');
    expect(html).toContain("<title>About · Overpass</title>");
    expect(html).not.toContain("<!--share-tags-->");
  });

  it("replaces the previous tags and the title on client-side navigation", () => {
    const { doc, live } = fakeDocument();
    const page = (path: string, key: "about" | "legal") =>
      shareTags({ ...base, path, language: "fr", page: key });
    applyShareTags(doc as unknown as Document, page("/about", "about"));
    const first = live().length;
    applyShareTags(doc as unknown as Document, page("/legal", "legal"));
    expect(doc.title).toBe("Mentions légales · Overpass");
    expect(live()).toHaveLength(first);
    const canonical = live().find((item) => item.attributes.get("rel") === "canonical");
    expect(canonical?.attributes.get("href")).toBe("https://overpass.africa/fr/legal");
  });
});
