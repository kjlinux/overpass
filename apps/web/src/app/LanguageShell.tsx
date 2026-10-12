import { useEffect } from "preact/hooks";
import { Route, Router, useRoute } from "preact-iso";
import { useTranslation } from "react-i18next";
import { ErrorBoundary, ErrorPage } from "../pages/errors";
import { rememberLanguage, toLanguage } from "./language";
import { lazyPage } from "./lazyPage";
import { RootRedirect } from "./RootRedirect";

const HomePage = lazyPage("app", async () => (await import("./HomePage")).HomePage);
const accounts = () => import("../pages/accounts");
const SignUpPage = lazyPage("accounts", async () => (await accounts()).SignUpPage);
const StacksPage = lazyPage("accounts", async () => (await accounts()).StacksPage);
const SignInPage = lazyPage("accounts", async () => (await accounts()).SignInPage);
const ForgotPage = lazyPage("accounts", async () => (await accounts()).ForgotPasswordPage);
const ResetPage = lazyPage("accounts", async () => (await accounts()).ResetPasswordPage);
const DashboardPage = lazyPage(
  "dashboard",
  async () => (await import("../pages/dashboard")).DashboardPage,
);
const SettingsPage = lazyPage(
  "settings",
  async () => (await import("../pages/settings")).SettingsPage,
);
const ProfilePage = lazyPage(
  "profile",
  async () => (await import("../pages/profile")).PublicProfilePage,
);
const ComponentsPage = lazyPage(
  "showcase",
  async () => (await import("../pages/showcase")).ComponentsPage,
);

/** Applies the language of the URL prefix and routes the rest of the path. */
export function LanguageShell() {
  const { params } = useRoute();
  const { i18n } = useTranslation();
  const language = toLanguage(params["lang"]);

  useEffect(() => {
    if (language === undefined) return;
    document.documentElement.lang = language;
    rememberLanguage(language);
    void i18n.changeLanguage(language);
  }, [i18n, language]);

  if (language === undefined) return <RootRedirect />;
  return (
    <ErrorBoundary language={language}>
      <Router>
        <Route path="/" component={HomePage} />
        <Route path="/components" component={ComponentsPage} />
        <Route path="/sign-up" component={SignUpPage} />
        <Route path="/sign-up/stacks" component={StacksPage} />
        <Route path="/sign-in" component={SignInPage} />
        <Route path="/forgot-password" component={ForgotPage} />
        <Route path="/reset-password" component={ResetPage} />
        <Route path="/dashboard" component={DashboardPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/members/:handle" component={ProfilePage} />
        <Route default component={NotFound} />
      </Router>
    </ErrorBoundary>
  );
}

function NotFound() {
  const { i18n } = useTranslation();
  const language = toLanguage(i18n.language);
  if (language === undefined) return <RootRedirect />;
  return <ErrorPage kind="notFound" language={language} />;
}
