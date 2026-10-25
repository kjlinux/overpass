import { trustRules } from "@overpass/shared";
import type { Me, MyCheck, Proposal, PublicProfile, RouteSummary } from "@overpass/shared";
import type { ComponentChildren, JSX } from "preact";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { ButtonLink, Skeleton } from "../../components/ui";
import { LoadError } from "../../forms";
import { Layout } from "../../layout";
import { localizedPath } from "../../layout/nav";
import { RequireSession, usePublicProfile } from "../../session";
import { Fetched } from "../routes/Fetched";
import { useApi } from "../routes/useApi";
import { MyChecksList, MyRoutesList } from "./MyLists";
import { MyProposalsList } from "./MyProposals";

function Column({ heading, children }: { heading: string; children: ComponentChildren }) {
  return (
    <div class="border-t border-rule py-8 lg:border-t-0 lg:px-6 lg:first:pl-0 lg:last:pr-0">
      <h2 class="mb-4 text-h2 font-semibold">{heading}</h2>
      {children}
    </div>
  );
}

function TrustNote({ profile }: { profile: PublicProfile }): JSX.Element {
  const { t } = useTranslation("dashboard");
  const missing = Math.max(0, trustRules.confirmedMinPoints - profile.points);
  return (
    <p class="mt-2">
      {profile.confirmed ? t("points.confirmed") : t("points.missing", { count: missing })}
    </p>
  );
}

function PointsColumn({ handle }: { handle: string }): JSX.Element {
  const { t } = useTranslation("dashboard");
  const language = useLanguage();
  const { state, retry } = usePublicProfile(handle);
  return (
    <Column heading={t("points.heading")}>
      {state.status === "ready" ? (
        <>
          <p class="text-display font-bold tabular-nums">{state.profile.points}</p>
          <TrustNote profile={state.profile} />
        </>
      ) : state.status === "error" ? (
        <LoadError error={state.error} onRetry={() => void retry()} />
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

function ProposalsSection(): JSX.Element {
  const { t } = useTranslation("dashboard");
  const proposals = useApi<Proposal[]>("/v1/me/service-proposals");
  return (
    <section aria-labelledby="proposals-heading" class="mt-8 border-t border-rule pt-8">
      <h2 id="proposals-heading" class="mb-4 text-h2 font-semibold">
        {t("proposals.heading")}
      </h2>
      <Fetched api={proposals}>{(items) => <MyProposalsList proposals={items} />}</Fetched>
    </section>
  );
}

function RoutesColumn(): JSX.Element {
  const { t } = useTranslation("dashboard");
  const routes = useApi<RouteSummary[]>("/v1/me/routes");
  return (
    <Column heading={t("routes.heading")}>
      <Fetched api={routes}>{(items) => <MyRoutesList routes={items} />}</Fetched>
    </Column>
  );
}

function ChecksColumn(): JSX.Element {
  const { t } = useTranslation("dashboard");
  const checks = useApi<MyCheck[]>("/v1/me/checks");
  return (
    <Column heading={t("checks.heading")}>
      <Fetched api={checks}>{(items) => <MyChecksList checks={items} />}</Fetched>
    </Column>
  );
}

function SandboxShortcut(): JSX.Element {
  const { t } = useTranslation("dashboard");
  const language = useLanguage();
  return (
    <ButtonLink variant="primary" href={localizedPath(language, "/sandbox")}>
      {t("sandbox")}
    </ButtonLink>
  );
}

function Board({ me }: { me: Me }): JSX.Element {
  const { t } = useTranslation("dashboard");
  return (
    <section class="py-12 md:py-16">
      <div class="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 class="text-h1 font-semibold">{t("title")}</h1>
          <p class="mt-2 text-ink-2">{t("greeting", { handle: me.handle })}</p>
        </div>
        <SandboxShortcut />
      </div>
      <div class="mt-10 grid lg:grid-cols-3 lg:divide-x lg:divide-rule lg:border-t lg:border-rule lg:pt-8">
        <RoutesColumn />
        <ChecksColumn />
        <PointsColumn handle={me.handle} />
      </div>
      <ProposalsSection />
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
