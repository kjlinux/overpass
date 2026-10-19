import type { Me } from "@overpass/shared";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Tabs } from "../../components/ui";
import type { Tab } from "../../components/ui";
import { Layout } from "../../layout";
import { RequireSession } from "../../session";
import { AccountSection } from "./AccountSection";
import { LanguageSection } from "./LanguageSection";
import { PasswordSection } from "./PasswordSection";
import { ProfileSection } from "./ProfileSection";
import { TokensSection } from "./TokensSection";

function useSettingsTabs(me: Me): Tab[] {
  const { t } = useTranslation("settings");
  const panels: [string, JSX.Element][] = [
    ["profile", <ProfileSection me={me} />],
    ["language", <LanguageSection me={me} />],
    ["password", <PasswordSection />],
    ["tokens", <TokensSection />],
    ["account", <AccountSection />],
  ];
  return panels.map(([id, content]) => ({ id, label: t(`tabs.${id}`), content }));
}

function Sections({ me }: { me: Me }): JSX.Element {
  const { t } = useTranslation("settings");
  const tabs = useSettingsTabs(me);
  const linked = location.hash.slice(1);
  const initial = tabs.some((tab) => tab.id === linked) ? linked : undefined;
  return (
    <section class="py-12 md:py-16">
      <h1 class="mb-8 text-h1 font-semibold">{t("title")}</h1>
      <Tabs
        id="settings"
        label={t("tabs.label")}
        tabs={tabs}
        {...(initial === undefined ? {} : { initial })}
      />
    </section>
  );
}

/** Language, password, tokens and account deletion, one tab each, plus the public profile. */
export function SettingsPage(): JSX.Element {
  const language = useLanguage();
  return (
    <Layout language={language}>
      <RequireSession>{(me) => <Sections me={me} />}</RequireSession>
    </Layout>
  );
}
