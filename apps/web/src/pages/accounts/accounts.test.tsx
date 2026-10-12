import { LocationProvider } from "preact-iso";
import { render } from "preact-render-to-string";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { setupTestI18n } from "../../i18n/test-i18n";
import { ProfileDetails } from "../profile/ProfileDetails";
import fr from "./locales/fr.json";
import { ForgotPasswordPage, SignInPage, SignUpPage, tokenFromHash } from "./index";

beforeAll(async () => {
  await setupTestI18n("fr");
  vi.stubGlobal("location", new URL("/fr/sign-up", "http://localhost"));
});

const page = (node: preact.ComponentChildren) =>
  render(<LocationProvider>{node}</LocationProvider>);

/** Only the page content, without the footer's newsletter field. */
const main = (html: string) => html.slice(html.indexOf("<main"), html.indexOf("</main>"));

describe("sign-up", () => {
  it("asks for exactly e-mail, password and country in one step", () => {
    const html = main(page(<SignUpPage />));
    expect(html.match(/<input/g)).toHaveLength(2);
    expect(html.match(/<select/g)).toHaveLength(1);
    expect(html).toContain('autocomplete="new-password"');
    expect(html).toContain(fr.fields.passwordHelp);
    expect(html).toContain("Côte d’Ivoire");
  });

  it("links each field to its help text", () => {
    const html = page(<SignUpPage />);
    expect(html).toContain('aria-describedby="password-help"');
    expect(html).toContain('aria-describedby="country-help"');
  });
});

describe("sign-in and recovery", () => {
  it("offers the forgotten password link next to the button", () => {
    expect(page(<SignInPage />)).toContain('href="/fr/forgot-password"');
  });

  it("asks for a single field to recover a password", () => {
    const html = main(page(<ForgotPasswordPage />));
    expect(html.match(/<input/g)).toHaveLength(1);
    expect(html).toContain(fr.forgot.intro);
  });

  it("reads the reset token from the fragment only", () => {
    expect(tokenFromHash("#token=abc.def")).toBe("abc.def");
    expect(tokenFromHash("")).toBeUndefined();
    expect(tokenFromHash("#token=")).toBeUndefined();
  });
});

describe("public profile", () => {
  const profile = {
    handle: "dev-7f3a2c",
    country: "SN",
    stacks: ["laravel"],
    contributions: { routes: 0, checks: 0, potholes: 0 },
    points: 0,
    memberSince: "2026-10-12T10:00:00.000Z",
  };

  it("shows country, stacks and an empty state without contributions", () => {
    const html = render(<ProfileDetails profile={profile} />);
    expect(html).toContain("Sénégal");
    expect(html).toContain("Laravel");
    expect(html).toContain("Pas encore de contribution");
  });

  it("lists contributions in a table once there are some", () => {
    const html = render(
      <ProfileDetails
        profile={{ ...profile, contributions: { routes: 1, checks: 2, potholes: 0 }, points: 14 }}
      />,
    );
    expect(html).toContain("<table");
    expect(html).toContain(">14<");
  });
});
