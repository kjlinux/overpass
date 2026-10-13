import { render } from "preact-render-to-string";
import { beforeAll, describe, expect, it } from "vitest";
import { setupTestI18n } from "../i18n/test-i18n";
import { Markdown, headingsOf, safeHref } from "./index";

beforeAll(async () => {
  await setupTestI18n("fr");
});

const html = (source: string) => render(<Markdown source={source} />);

describe("Markdown rendering", () => {
  it("renders headings, paragraphs, lists and emphasis", () => {
    const out = html("## Prérequis\n\nUn **compte** et une *clé*.\n\n- un\n- deux");
    expect(out).toContain('<h2 id="prerequis"');
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

  it("shows images as their alternative text only", () => {
    const out = html("![Logo de Wave](https://example.com/logo.png)");
    expect(out).not.toContain("example.com");
    expect(out).toContain("Logo de Wave");
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
  it("lists the section headings with stable anchors", () => {
    expect(headingsOf("## Prérequis\n\ntext\n\n## Recevoir le webhook\n\n### Détail")).toEqual([
      { id: "prerequis", text: "Prérequis" },
      { id: "recevoir-le-webhook", text: "Recevoir le webhook" },
    ]);
  });
});
