import { routeTemplate } from "@overpass/shared";
import { LocationProvider } from "preact-iso";
import { render } from "preact-render-to-string";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { setupTestI18n } from "../../i18n/test-i18n";
import { detail, services } from "./fixtures";
import fr from "./locales/fr.json";
import { EditorView, draftFrom, newDraft } from "./index";

beforeAll(async () => {
  await setupTestI18n("fr");
  vi.stubGlobal("location", new URL("/fr/routes/new", "http://localhost"));
});

const editor = (draft = newDraft("fr")) =>
  render(
    <LocationProvider>
      <EditorView mode="create" initial={draft} services={services} onSaved={() => undefined} />
    </LocationProvider>,
  );

describe("newDraft and draftFrom", () => {
  it("prefills the template of the chosen language", () => {
    expect(newDraft("en").content).toBe(routeTemplate("en"));
    expect(newDraft("fr").language).toBe("fr");
  });

  it("starts an edit from the stored itinerary", () => {
    expect(draftFrom(detail)).toMatchObject({
      service: "wave",
      country: "CI",
      title: detail.title,
    });
  });
});

describe("EditorView", () => {
  it("asks for title, service, country, stack, language and content", () => {
    const html = editor();
    expect(html).toContain('id="title"');
    expect(html.match(/<select/g)).toHaveLength(4);
    expect(html).toContain("<textarea");
    expect(html).toContain(fr.editor.submitCreate);
  });

  it("shows a live preview of the Markdown, never raw HTML", () => {
    const html = editor({ ...newDraft("fr"), content: "## Essai\n\n<script>x</script>" });
    expect(html).toContain(fr.editor.preview);
    expect(html).toContain('<h2 id="essai"');
    expect(html).not.toContain("<script>x");
  });
});
