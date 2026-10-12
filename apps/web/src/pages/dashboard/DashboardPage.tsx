import type { Me } from "@overpass/shared";
import { CircleCheck, Route } from "lucide-preact";
import type { ComponentChildren, JSX } from "preact";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { ButtonLink, EmptyState, Skeleton } from "../../components/ui";
import { Layout } from "../../layout";
import { localizedPath } from "../../layout/nav";
import { RequireSession, usePublicProfile } from "../../session";

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

function EmptyColumns(): JSX.Element {
  const { t } = useTranslation("dashboard");
  const language = useLanguage();
  const write = (
    <ButtonLink href={localizedPath(language, "/routes/new")}>{t("routes.action")}</ButtonLink>
  );
  const browse = (
    <ButtonLink href={localizedPath(language, "/routes")}>{t("checks.action")}</ButtonLink>
  );
  return (
    <>
      <Column heading={t("routes.heading")}>
        <EmptyState
          icon={Route}
          title={t("routes.emptyTitle")}
          description={t("routes.emptyText")}
          action={write}
        />
      </Column>
      <Column heading={t("checks.heading")}>
        <EmptyState
          icon={CircleCheck}
          title={t("checks.emptyTitle")}
          description={t("checks.emptyText")}
          action={browse}
        />
      </Column>
    </>
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
        <EmptyColumns />
        <PointsColumn handle={me.handle} />
      </div>
    </section>
  );
}

/** The member's home: empty sections until the itinerary and check modules exist. */
export function DashboardPage(): JSX.Element {
  const language = useLanguage();
  return (
    <Layout language={language}>
      <RequireSession>{(me) => <Board me={me} />}</RequireSession>
    </Layout>
  );
}
