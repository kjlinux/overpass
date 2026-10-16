import type { SimulatorRequest } from "@overpass/shared";
import { Vote } from "lucide-preact";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { ButtonLink, EmptyState, Skeleton, Table } from "../../components/ui";
import type { Column } from "../../components/ui";
import { FormAlert } from "../../forms";
import { Layout, localizedPath } from "../../layout";
import { useApi } from "../routes";

function RequestTable({ rows }: { rows: SimulatorRequest[] }): JSX.Element {
  const { t } = useTranslation("requests");
  const language = useLanguage();
  const columns: Column<SimulatorRequest>[] = [
    {
      key: "rank",
      header: t("ranking.rank"),
      numeric: true,
      render: (row) => <span class="font-bold">{row.rank}</span>,
    },
    {
      key: "service",
      header: t("ranking.service"),
      render: (row) => (
        <a href={localizedPath(language, `/services/${row.service.slug}`)}>{row.service.name}</a>
      ),
    },
    {
      key: "category",
      header: t("ranking.category"),
      render: (row) => t(`category.${row.service.category}`),
    },
    {
      key: "votes",
      header: t("ranking.votes"),
      numeric: true,
      render: (row) => <span class="font-bold">{row.votes}</span>,
    },
  ];
  return (
    <Table
      caption={t("ranking.title")}
      columns={columns}
      rows={rows}
      rowKey={(row) => row.service.slug}
    />
  );
}

/** The public ranking of the simulators members ask for. */
export function SimulatorRequestsPage(): JSX.Element {
  const { t } = useTranslation("requests");
  const language = useLanguage();
  const { state } = useApi<SimulatorRequest[]>("/v1/simulator-requests");
  const browse = (
    <ButtonLink href={localizedPath(language, "/routes")}>{t("ranking.browse")}</ButtonLink>
  );
  return (
    <Layout language={language}>
      <section class="py-12 md:py-16">
        <div class="flex flex-wrap items-end justify-between gap-6 border-b border-rule pb-6">
          <div class="max-w-prose">
            <h1 class="text-h1 font-semibold">{t("ranking.title")}</h1>
            <p class="mt-2 text-ink-2">{t("ranking.intro")}</p>
          </div>
          <ButtonLink href={localizedPath(language, "/services/propose")}>
            {t("propose.link")}
          </ButtonLink>
        </div>
        <div class="mt-8">
          {state.status === "error" ? <FormAlert error={state.error} /> : null}
          {state.status === "loading" ? <Skeleton lines={5} /> : null}
          {state.status === "ready" && state.data.length === 0 ? (
            <EmptyState
              icon={Vote}
              title={t("ranking.emptyTitle")}
              description={t("ranking.emptyText")}
              action={browse}
            />
          ) : null}
          {state.status === "ready" && state.data.length > 0 ? (
            <RequestTable rows={state.data} />
          ) : null}
        </div>
      </section>
    </Layout>
  );
}
