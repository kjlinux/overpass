import type { LogEntry } from "@overpass/shared";
import { ScrollText } from "lucide-preact";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Table } from "../../components/ui";
import type { Column } from "../../components/ui";
import { formatDate } from "../routes";
import { PagedView } from "./PagedView";
import { usePaged } from "./usePaged";

function useColumns(): Column<LogEntry>[] {
  const { t } = useTranslation("admin");
  const language = useLanguage();
  return [
    {
      key: "date",
      header: t("log.date"),
      render: (row) => <span class="whitespace-nowrap">{formatDate(row.createdAt, language)}</span>,
    },
    { key: "actor", header: t("log.actor"), render: (row) => row.actor ?? t("log.deletedActor") },
    { key: "action", header: t("log.action"), render: (row) => t(`log.actions.${row.action}`) },
    {
      key: "target",
      header: t("log.target"),
      render: (row) => (
        <span class="whitespace-nowrap">
          {t(`log.targets.${row.targetKind}`)}{" "}
          <code class="font-code text-caption text-ink-2">{row.targetId.slice(0, 8)}</code>
        </span>
      ),
    },
    {
      key: "reason",
      header: t("log.reason"),
      render: (row) => (
        <span class="block min-w-48 max-w-prose [overflow-wrap:anywhere]">
          {row.reason ?? t("log.noReason")}
        </span>
      ),
    },
  ];
}

/** Insert-only history of the team's decisions, newest first, fifty at a time. */
export function LogTab(): JSX.Element {
  const { t } = useTranslation("admin");
  const { state, more } = usePaged<LogEntry>("/v1/admin/log");
  const columns = useColumns();
  const empty = { icon: ScrollText, title: t("log.emptyTitle"), description: t("log.emptyText") };
  return (
    <section aria-labelledby="log-heading" class="flex flex-col gap-6 px-4 py-8 md:px-6">
      <h2 id="log-heading" class="text-h2 font-semibold">
        {t("log.heading")}
      </h2>
      <PagedView state={state} more={more} empty={empty}>
        {(items) => (
          <Table
            caption={t("log.caption")}
            columns={columns}
            rows={items}
            rowKey={(row) => row.id}
          />
        )}
      </PagedView>
    </section>
  );
}
