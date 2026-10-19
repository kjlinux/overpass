import type { Me } from "@overpass/shared";
import type { JSX } from "preact";
import { useEffect, useState } from "preact/hooks";
import { useLocation } from "preact-iso";
import { useTranslation } from "react-i18next";
import { PageSkeleton } from "../../app/PageSkeleton";
import { useLanguage } from "../../app/useLanguage";
import { Tabs } from "../../components/ui";
import { Layout, localizedPath } from "../../layout";
import { RequireSession } from "../../session";
import { AccountsTab } from "./AccountsTab";
import { ContentTab } from "./ContentTab";
import { LogTab } from "./LogTab";
import { QueueTab } from "./QueueTab";

function Refused(): JSX.Element {
  const { t } = useTranslation("admin");
  return (
    <section class="py-12 md:py-16">
      <h1 class="text-h1 font-semibold">{t("refusedTitle")}</h1>
      <p class="mt-2 max-w-prose">{t("refused")}</p>
    </section>
  );
}

/** Only admins reach the tabs; the API checks the role again on every call. */
export function AdminScreen({ me }: { me: Me }): JSX.Element {
  const { t } = useTranslation("admin");
  const [active, setActive] = useState("queue");
  if (me.role !== "admin") return <Refused />;
  // Only the open panel is mounted, so each visit reads fresh data from the API.
  const shown = (id: string, content: JSX.Element) => (id === active ? content : null);
  const tabs = [
    { id: "queue", label: t("tabs.queue"), content: shown("queue", <QueueTab />) },
    {
      id: "accounts",
      label: t("tabs.accounts"),
      content: shown("accounts", <AccountsTab me={me} />),
    },
    { id: "content", label: t("tabs.content"), content: shown("content", <ContentTab />) },
    { id: "log", label: t("tabs.log"), content: shown("log", <LogTab />) },
  ];
  return (
    <section class="py-12 md:py-16">
      <h1 class="text-h1 font-semibold">{t("title")}</h1>
      <p class="mt-2 max-w-prose text-ink-2">{t("intro")}</p>
      <div class="mt-8">
        <Tabs id="admin" label={t("tabsLabel")} tabs={tabs} onChange={setActive} />
      </div>
    </section>
  );
}

export function AdminPage(): JSX.Element {
  const language = useLanguage();
  return (
    <Layout language={language}>
      <RequireSession>{(me) => <AdminScreen me={me} />}</RequireSession>
    </Layout>
  );
}

/** The former moderation addresses keep working for bookmarks and older links. */
export function ModerationRedirect(): JSX.Element {
  const { route } = useLocation();
  const language = useLanguage();
  useEffect(() => {
    route(localizedPath(language, "/admin"), true);
  }, [route, language]);
  return <PageSkeleton />;
}
