import { render } from "preact-render-to-string";
import { describe, expect, it } from "vitest";
import { setupTestI18n } from "../../i18n/test-i18n";
import { RouteDialog } from "./RouteDialog";

const noop = () => undefined;

function dialog(title: string) {
  return (
    <RouteDialog
      open={false}
      title={title}
      text=""
      submitLabel="OK"
      busy={false}
      error={undefined}
      onSubmit={noop}
      onClose={noop}
    >
      {null}
    </RouteDialog>
  );
}

describe("route dialogs", () => {
  it("label each dialog by its own title when two share a page", async () => {
    await setupTestI18n("fr");
    const html = render(
      <>
        {dialog("Signaler cette fiche")}
        {dialog("Ça marche chez moi")}
      </>,
    );
    const labelled = [...html.matchAll(/aria-labelledby="([^"]+)"/g)].map((m) => m[1]);
    const titles = [...html.matchAll(/<h2 id="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(labelled).size).toBe(2);
    expect(labelled).toEqual(titles);
  });
});
