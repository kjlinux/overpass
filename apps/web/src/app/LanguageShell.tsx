import { useEffect } from "preact/hooks";
import { Route, Router, useRoute } from "preact-iso";
import { useTranslation } from "react-i18next";
import { ErrorBoundary, ErrorPage } from "../pages/errors";
import { rememberLanguage, toLanguage } from "./language";
import { contentRoutes } from "./contentRoutes";
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
const sandbox = () => import("../pages/sandbox");
const TrackPage = lazyPage("sandbox", async () => (await sandbox()).TrackPage);
const DemoPage = lazyPage("sandbox", async () => (await sandbox()).DemoPage);
const LaunchPage = lazyPage("sandbox", async () => (await sandbox()).LaunchPage);
const ComponentsPage = lazyPage(
  "showcase",
  async () => (await import("../pages/showcase")).ComponentsPage,
);
const discussions = () => import("../pages/discussions");
const ThreadsPage = lazyPage("discussions", async () => (await discussions()).ThreadsPage);
const NewThreadPage = lazyPage("discussions", async () => (await discussions()).NewThreadPage);
const ThreadPage = lazyPage("discussions", async () => (await discussions()).ThreadPage);
const RankingPage = lazyPage("ranking", async () => (await import("../pages/ranking")).RankingPage);
const requests = () => import("../pages/requests");
const ServicePage = lazyPage("requests", async () => (await requests()).ServicePage);
const ProposePage = lazyPage("requests", async () => (await requests()).ProposePage);
const RequestsPage = lazyPage("requests", async () => (await requests()).SimulatorRequestsPage);
const ModerationPage = lazyPage(
  ["moderation", "blog"],
  async () => (await import("../pages/moderation")).ModerationPage,
);

/** Discussions, ranking, service requests and moderation; the router flattens the array. */
const communityRoutes = [
  ["/discussions", ThreadsPage],
  ["/discussions/new", NewThreadPage],
  ["/discussions/:id", ThreadPage],
  ["/ranking", RankingPage],
  ["/services/propose", ProposePage],
  ["/services/:slug", ServicePage],
  ["/simulator-requests", RequestsPage],
  ["/admin/moderation", ModerationPage],
] as const;

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
        <Route path="/sandbox" component={TrackPage} />
        <Route path="/sandbox/demo" component={DemoPage} />
        <Route path="/sandbox/launch/:provider/:id" component={LaunchPage} />
        {[...communityRoutes, ...contentRoutes].map(([path, page]) => (
          <Route key={path} path={path} component={page} />
        ))}
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
