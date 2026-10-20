import { render } from "preact-render-to-string";
import { beforeAll, describe, expect, it } from "vitest";
import ui from "../../components/ui/locales/fr.json";
import { setupTestI18n } from "../../i18n/test-i18n";
import fr from "./locales/fr.json";
import { QuestionsBody } from "./RouteQuestions";

beforeAll(async () => {
  await setupTestI18n("fr");
});

describe("route questions", () => {
  it("shows the load error with a retry instead of no question", () => {
    const error = { code: "server_error", message: "Le serveur ne répond pas." };
    const html = render(
      <QuestionsBody
        api={{ state: { status: "error", error }, reload: () => Promise.resolve() }}
      />,
    );
    expect(html).toContain(error.message);
    expect(html).toContain(ui.retry);
    expect(html).not.toContain(fr.questions.noneOpen);
  });

  it("does not claim there is no question while loading", () => {
    const html = render(
      <QuestionsBody api={{ state: { status: "loading" }, reload: () => Promise.resolve() }} />,
    );
    expect(html).not.toContain(fr.questions.noneOpen);
  });

  it("lists nothing open when the route has no question", () => {
    const state = { status: "ready" as const, data: { items: [], nextCursor: null } };
    const html = render(<QuestionsBody api={{ state: state, reload: () => Promise.resolve() }} />);
    expect(html).toContain(fr.questions.noneOpen);
  });
});
