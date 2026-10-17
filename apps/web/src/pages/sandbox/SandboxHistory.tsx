import type { SandboxEventOutput } from "@overpass/shared";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { Card, Table } from "../../components/ui";
import type { Column } from "../../components/ui";

type Props = {
  events: readonly SandboxEventOutput[];
};

function buildColumns(t: (k: string) => string): Column<SandboxEventOutput>[] {
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
        <span class="text-caption text-ink-2">{new Date(e.createdAt).toLocaleTimeString()}</span>
      ),
    },
  ];
}

export function SandboxHistory({ events }: Props): JSX.Element {
  const { t } = useTranslation("sandbox");

  if (events.length === 0) {
    return (
      <Card title={t("history.title")}>
        <p class="text-caption text-ink-2 py-4 text-center">{t("history.empty")}</p>
      </Card>
    );
  }

  const columns = buildColumns(t);
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
