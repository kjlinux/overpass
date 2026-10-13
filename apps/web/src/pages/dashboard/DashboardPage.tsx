import type { Me, MyCheck, RouteSummary } from "@overpass/shared";
import type { ComponentChildren, JSX } from "preact";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { ButtonLink, Skeleton } from "../../components/ui";
import { Layout } from "../../layout";
import { localizedPath } from "../../layout/nav";
import { RequireSession, usePublicProfile } from "../../session";
import { useApi } from "../routes/useApi";
import { MyChecksList, MyRoutesList } from "./MyLists";

function Column({ heading, children }: { heading: string; children: ComponentChildren }) {
  return (
    <div class="border-t border-rule py-8 lg:border-t-0 lg:px-6 lg:first:pl-0 lg:last:pr-0">
      <h2 class="mb-4 text-h2 font-semibold">{heading}</h2>
      {children}
    </div>
  );
}

function PointsColumn({ handle }: { handle: string }): JSX.Element {
  const { t } = useTranslation("dashboard");
  const language = useLanguage();
  const { state } = usePublicProfile(handle);
  return (
    <Column heading={t("points.heading")}>
      {state.status === "ready" ? (
        <p class="text-display font-bold tabular-nums">{state.profile.points}</p>
      ) : (
        <Skeleton title={false} lines={1} />
      )}
      <p class="mt-2 text-ink-2">{t("points.caption")}</p>
      <a
        class="mt-4 inline-flex min-h-tap items-center"
        href={localizedPath(language, `/members/${handle}`)}
      >
        {t("points.profile")}
      </a>
    </Column>
  );
}

function Loading(): JSX.Element {
  return <Skeleton title={false} lines={3} />;
}

function RoutesColumn(): JSX.Element {
  const { t } = useTranslation("dashboard");
  const { state } = useApi<RouteSummary[]>("/v1/me/routes");
  return (
    <Column heading={t("routes.heading")}>
      {state.status === "ready" ? <MyRoutesList routes={state.data} /> : <Loading />}
    </Column>
  );
}

function ChecksColumn(): JSX.Element {
  const { t } = useTranslation("dashboard");
  const { state } = useApi<MyCheck[]>("/v1/me/checks");
  return (
    <Column heading={t("checks.heading")}>
      {state.status === "ready" ? <MyChecksList checks={state.data} /> : <Loading />}
    </Column>
  );
}

function Board({ me }: { me: Me }): JSX.Element {
  const { t } = useTranslation("dashboard");
  const language = useLanguage();
  return (
    <section class="py-12 md:py-16">
      <div class="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 class="text-h1 font-semibold">{t("title")}</h1>
          <p class="mt-2 text-ink-2">{t("greeting", { handle: me.handle })}</p>
        </div>
        <ButtonLink variant="primary" href={localizedPath(language, "/sandbox")}>
          {t("sandbox")}
        </ButtonLink>
      </div>
      <div class="mt-10 grid lg:grid-cols-3 lg:divide-x lg:divide-rule lg:border-t lg:border-rule lg:pt-8">
        <RoutesColumn />
        <ChecksColumn />
        <PointsColumn handle={me.handle} />
      </div>
    </section>
  );
}

/** The member's home: my itineraries, my checks, my points and the test track. */
export function DashboardPage(): JSX.Element {
  const language = useLanguage();
  return (
    <Layout language={language}>
      <RequireSession>{(me) => <Board me={me} />}</RequireSession>
    </Layout>
  );
}
