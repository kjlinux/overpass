import aboutFr from "../apps/web/src/pages/about/locales/fr.json" with { type: "json" };
import aboutEn from "../apps/web/src/pages/about/locales/en.json" with { type: "json" };
import accountsFr from "../apps/web/src/pages/accounts/locales/fr.json" with { type: "json" };
import accountsEn from "../apps/web/src/pages/accounts/locales/en.json" with { type: "json" };
import adminFr from "../apps/web/src/pages/admin/locales/fr.json" with { type: "json" };
import adminEn from "../apps/web/src/pages/admin/locales/en.json" with { type: "json" };
import apiFr from "../packages/shared/src/i18n/locales/fr.json" with { type: "json" };
import apiEn from "../packages/shared/src/i18n/locales/en.json" with { type: "json" };
import appFr from "../apps/web/src/app/locales/fr.json" with { type: "json" };
import appEn from "../apps/web/src/app/locales/en.json" with { type: "json" };
import blogFr from "../apps/web/src/pages/blog/locales/fr.json" with { type: "json" };
import blogEn from "../apps/web/src/pages/blog/locales/en.json" with { type: "json" };
import cliFr from "../apps/cli/src/locales/fr.json" with { type: "json" };
import cliEn from "../apps/cli/src/locales/en.json" with { type: "json" };
import dashboardFr from "../apps/web/src/pages/dashboard/locales/fr.json" with { type: "json" };
import dashboardEn from "../apps/web/src/pages/dashboard/locales/en.json" with { type: "json" };
import discussionsFr from "../apps/web/src/pages/discussions/locales/fr.json" with { type: "json" };
import discussionsEn from "../apps/web/src/pages/discussions/locales/en.json" with { type: "json" };
import docsFr from "../apps/web/src/pages/docs/locales/fr.json" with { type: "json" };
import docsEn from "../apps/web/src/pages/docs/locales/en.json" with { type: "json" };
import homeFr from "../apps/web/src/home/locales/fr.json" with { type: "json" };
import homeEn from "../apps/web/src/home/locales/en.json" with { type: "json" };
import layoutFr from "../apps/web/src/layout/locales/fr.json" with { type: "json" };
import layoutEn from "../apps/web/src/layout/locales/en.json" with { type: "json" };
import legalFr from "../apps/web/src/pages/legal/locales/fr.json" with { type: "json" };
import legalEn from "../apps/web/src/pages/legal/locales/en.json" with { type: "json" };
import newsletterFr from "../apps/web/src/pages/newsletter/locales/fr.json" with { type: "json" };
import newsletterEn from "../apps/web/src/pages/newsletter/locales/en.json" with { type: "json" };
import pricingFr from "../apps/web/src/pages/pricing/locales/fr.json" with { type: "json" };
import pricingEn from "../apps/web/src/pages/pricing/locales/en.json" with { type: "json" };
import requestsFr from "../apps/web/src/pages/requests/locales/fr.json" with { type: "json" };
import requestsEn from "../apps/web/src/pages/requests/locales/en.json" with { type: "json" };
import routesFr from "../apps/web/src/pages/routes/locales/fr.json" with { type: "json" };
import routesEn from "../apps/web/src/pages/routes/locales/en.json" with { type: "json" };
import sandboxFr from "../apps/web/src/pages/sandbox/locales/fr.json" with { type: "json" };
import sandboxEn from "../apps/web/src/pages/sandbox/locales/en.json" with { type: "json" };
import settingsFr from "../apps/web/src/pages/settings/locales/fr.json" with { type: "json" };
import settingsEn from "../apps/web/src/pages/settings/locales/en.json" with { type: "json" };
import shareFr from "../apps/web/src/share/locales/fr.json" with { type: "json" };
import shareEn from "../apps/web/src/share/locales/en.json" with { type: "json" };
import uiFr from "../apps/web/src/components/ui/locales/fr.json" with { type: "json" };
import uiEn from "../apps/web/src/components/ui/locales/en.json" with { type: "json" };

export const fr = {
  about: aboutFr,
  accounts: accountsFr,
  admin: adminFr,
  api: apiFr,
  app: appFr,
  blog: blogFr,
  cli: cliFr,
  dashboard: dashboardFr,
  discussions: discussionsFr,
  docs: docsFr,
  home: homeFr,
  layout: layoutFr,
  legal: legalFr,
  newsletter: newsletterFr,
  pricing: pricingFr,
  requests: requestsFr,
  routes: routesFr,
  sandbox: sandboxFr,
  settings: settingsFr,
  share: shareFr,
  ui: uiFr,
};

export type Bundle = typeof fr;

/** Typed as the French shape, so a key missing in English fails the type check. */
export const en: Bundle = {
  about: aboutEn,
  accounts: accountsEn,
  admin: adminEn,
  api: apiEn,
  app: appEn,
  blog: blogEn,
  cli: cliEn,
  dashboard: dashboardEn,
  discussions: discussionsEn,
  docs: docsEn,
  home: homeEn,
  layout: layoutEn,
  legal: legalEn,
  newsletter: newsletterEn,
  pricing: pricingEn,
  requests: requestsEn,
  routes: routesEn,
  sandbox: sandboxEn,
  settings: settingsEn,
  share: shareEn,
  ui: uiEn,
};
