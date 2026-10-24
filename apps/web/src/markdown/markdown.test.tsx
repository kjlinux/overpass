import { render } from "preact-render-to-string";
import { beforeAll, describe, expect, it } from "vitest";
import { setupTestI18n } from "../i18n/test-i18n";
import { Markdown, headingsOf, safeHref, safeImageSrc } from "./index";

beforeAll(async () => {
  await setupTestI18n("fr");
});

const html = (source: string) => render(<Markdown source={source} />);

describe("Markdown rendering", () => {
  it("renders headings, paragraphs, lists and emphasis", () => {
    const out = html("## Prérequis\n\nUn **compte** et une *clé*.\n\n- un\n- deux");
    expect(out).toContain('<h2 id="s-prerequis"');
    expect(out).toContain("<strong>compte</strong>");
    expect(out).toContain("<em>clé</em>");
    expect(out).toContain("<li>un</li>");
  });

  it("demotes a level one heading, the page already has its title", () => {
    expect(html("# Titre")).toContain("<h2");
    expect(html("# Titre")).not.toContain("<h1");
  });

  it("renders fenced code in a copyable code block with its language", () => {
    const out = html("```php\necho 'ok';\n```");
    expect(out).toContain("php");
    expect(out).toContain("<code>echo 'ok';</code>");
    expect(out).toContain("aria-live");
  });

  it("renders inline code and tables", () => {
    const out = html("Le `amount` compte.\n\n| a | b |\n| - | - |\n| 1 | 2 |");
    expect(out).toContain("<code");
    expect(out).toContain("<table");
    expect(out).toContain("<td>2</td>");
  });
});

describe("Markdown sanitising", () => {
  it("never renders raw HTML, scripts included", () => {
    const out = html('<script>alert(1)</script>\n\n<img src=x onerror="alert(1)">');
    expect(out).not.toContain("<script");
    expect(out).not.toContain("<img");
    expect(out).toContain("&lt;script>alert(1)&lt;/script>");
  });

  it("never turns javascript, data or relative targets into links", () => {
    const out = html(
      "[clic](javascript:alert(1)) [data](data:text/html;base64,PHNjcmlwdD4=) [admin](/admin)",
    );
    expect(out).not.toContain("<a");
    expect(out).not.toContain("href");
    expect(out).toContain("clic");
    expect(out).toContain("<span>admin</span>");
  });

  it("opens safe links without leaking the referrer", () => {
    const out = html("[docs](https://docs.wave.com/checkout)");
    expect(out).toContain('href="https://docs.wave.com/checkout"');
    expect(out).toContain('rel="noopener noreferrer nofollow"');
  });

  it("shows an outside image as its alternative text only", () => {
    const out = html("![Logo de Wave](https://example.com/logo.png)");
    expect(out).not.toContain("example.com");
    expect(out).not.toContain("<img");
    expect(out).toContain("Logo de Wave");
  });

  it("shows an image hosted by Overpass, lazily, with its alternative text", () => {
    const src = "/v1/media/7c7c5d0e-4a8f-4d6a-9b0e-2f1c9d3a1b11";
    const out = html(`![Capture du tableau de bord](${src})`);
    expect(out).toContain(`src="${src}"`);
    expect(out).toContain('alt="Capture du tableau de bord"');
    expect(out).toContain('loading="lazy"');
  });
});

describe("safeImageSrc", () => {
  it("accepts only an Overpass media address", () => {
    const id = "7c7c5d0e-4a8f-4d6a-9b0e-2f1c9d3a1b11";
    expect(safeImageSrc(`/v1/media/${id}`)).toBe(`/v1/media/${id}`);
    expect(safeImageSrc(`/v1/media/${id}/../../admin`)).toBeUndefined();
    expect(safeImageSrc(`https://evil.example/v1/media/${id}`)).toBeUndefined();
    expect(safeImageSrc("data:image/png;base64,AAAA")).toBeUndefined();
  });
});

describe("safeHref", () => {
  it("accepts http, https and mailto only", () => {
    expect(safeHref("https://a.example")).toBe("https://a.example");
    expect(safeHref("mailto:awa@example.com")).toBe("mailto:awa@example.com");
    expect(safeHref(" JavaScript:alert(1)")).toBeUndefined();
    expect(safeHref("/relative")).toBeUndefined();
    expect(safeHref("vbscript:x")).toBeUndefined();
  });
});

describe("headingsOf", () => {
  it("prefixes member anchors so a heading cannot take a page id", () => {
    expect(headingsOf("## potholes")).toEqual([{ id: "s-potholes", text: "potholes" }]);
  });

  it("lists the section headings with stable anchors", () => {
    expect(headingsOf("## Prérequis\n\ntext\n\n## Recevoir le webhook\n\n### Détail")).toEqual([
      { id: "s-prerequis", text: "Prérequis" },
      { id: "s-recevoir-le-webhook", text: "Recevoir le webhook" },
    ]);
  });
});
