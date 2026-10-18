import type { SandboxEventOutput } from "@overpass/shared";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Card, Table } from "../../components/ui";
import type { Column } from "../../components/ui";

type Props = {
  events: readonly SandboxEventOutput[];
};

function formatEventDate(iso: string, language: string): string {
  return new Intl.DateTimeFormat(language, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function buildColumns(t: (k: string) => string, language: string): Column<SandboxEventOutput>[] {
  return [
    {
      key: "scenario",
      header: t("history.colScenario"),
      render: (e: SandboxEventOutput) => (
        <span class="font-medium text-ink">{t(`scenarios.${e.scenario}`)}</span>
      ),
    },
    {
      key: "status",
      header: t("history.colStatus"),
      render: (e: SandboxEventOutput) => (
        <span class="font-mono text-caption">{e.responseStatus}</span>
      ),
    },
    {
      key: "webhooks",
      header: t("history.colWebhooks"),
      render: (e: SandboxEventOutput) => <span class="text-caption">{e.webhooks.length}</span>,
    },
    {
      key: "date",
      header: t("history.colDate"),
      render: (e: SandboxEventOutput) => (
        <span class="text-caption text-ink-2">{formatEventDate(e.createdAt, language)}</span>
      ),
    },
  ];
}

export function SandboxHistory({ events }: Props): JSX.Element {
  const { t } = useTranslation("sandbox");
  const language = useLanguage();

  if (events.length === 0) {
    return (
      <Card title={t("history.title")}>
        <p class="text-caption text-ink-2 py-4 text-center">{t("history.empty")}</p>
      </Card>
    );
  }

  const columns = buildColumns(t, language);
  return (
    <Card title={t("history.title")}>
      <Table<SandboxEventOutput>
        caption={t("history.title")}
        columns={columns}
        rows={[...events]}
        rowKey={(e) => e.id}
      />
    </Card>
  );
}
