import { render } from "preact-render-to-string";
import { beforeAll, describe, expect, it } from "vitest";
import ui from "../components/ui/locales/fr.json";
import { setupTestI18n } from "../i18n/test-i18n";
import { networkErrorCode } from "../session/api";
import { LoadError } from "./LoadError";

beforeAll(async () => {
  await setupTestI18n("fr");
});

describe("LoadError", () => {
  it("announces the error and offers to try again", () => {
    const error = { code: "internal", message: "Panne." };
    const html = render(<LoadError error={error} onRetry={() => undefined} />);
    expect(html).toContain('role="alert"');
    expect(html).toContain("Panne.");
    expect(html).toContain(`<button type="button"`);
    expect(html).toContain(ui.retry);
  });

  it("says the API could not be reached on a network failure", () => {
    const error = { code: networkErrorCode, message: "fetch failed" };
    const html = render(<LoadError error={error} onRetry={() => undefined} />);
    expect(html).toContain(ui.networkError);
  });
});
