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
const ConfirmPage = lazyPage("accounts", async () => (await accounts()).ConfirmSignUpPage);
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
const routes = () => import("../pages/routes");
const CataloguePage = lazyPage("routes", async () => (await routes()).CataloguePage);
const DetailPage = lazyPage("routes", async () => (await routes()).DetailPage);
const NewRoutePage = lazyPage("routes", async () => (await routes()).NewRoutePage);
const EditRoutePage = lazyPage("routes", async () => (await routes()).EditRoutePage);
const ComponentsPage = lazyPage(
  "showcase",
  async () => (await import("../pages/showcase")).ComponentsPage,
);
const SandboxPage = lazyPage("sandbox", async () => (await import("../pages/sandbox")).SandboxPage);
const discussions = () => import("../pages/discussions");
const DiscussionsPage = lazyPage("discussions", async () => (await discussions()).DiscussionsPage);
const NewThreadPage = lazyPage("discussions", async () => (await discussions()).NewThreadPage);
const ThreadDetailPage = lazyPage(
  "discussions",
  async () => (await discussions()).ThreadDetailPage,
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
        <Route path="/sandbox" component={SandboxPage} />
        <Route path="/sign-up" component={SignUpPage} />
        <Route path="/sign-up/confirm" component={ConfirmPage} />
        <Route path="/sign-up/stacks" component={StacksPage} />
        <Route path="/sign-in" component={SignInPage} />
        <Route path="/forgot-password" component={ForgotPage} />
        <Route path="/reset-password" component={ResetPage} />
        <Route path="/dashboard" component={DashboardPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/members/:handle" component={ProfilePage} />
        <Route path="/routes" component={CataloguePage} />
        <Route path="/routes/new" component={NewRoutePage} />
        <Route path="/routes/:id/edit" component={EditRoutePage} />
        <Route path="/routes/:id" component={DetailPage} />
        <Route path="/discussions" component={DiscussionsPage} />
        <Route path="/discussions/new" component={NewThreadPage} />
        <Route path="/discussions/:id" component={ThreadDetailPage} />
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
