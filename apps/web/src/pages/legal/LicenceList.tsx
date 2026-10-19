import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { Table } from "../../components/ui";
import type { Column } from "../../components/ui";
import type { LicenceGroup, LicenceReport } from "./licenceReport";

function PackageGroup({ group }: { group: LicenceGroup }): JSX.Element {
  const { t } = useTranslation("legal");
  return (
    <details class="border-t border-rule first:border-t-0">
      <summary class="cursor-pointer py-3 font-semibold">
        {t("licences.packages", { total: group.count, licence: group.licence })}
      </summary>
      <ul class="m-0 list-none columns-1 gap-8 p-0 pb-4 font-code text-code md:columns-2">
        {group.packages.map((item) => (
          <li key={item.name} class="break-inside-avoid [overflow-wrap:anywhere]">
            {item.name}
            {item.dev ? <span class="font-text text-ink-2"> {t("licences.dev")}</span> : null}
          </li>
        ))}
      </ul>
    </details>
  );
}

/** The licence audit as generated in docs/LICENSES.md: totals, then every package. */
export function LicenceList({ report }: { report: LicenceReport }): JSX.Element {
  const { t } = useTranslation("legal");
  const columns: Column<LicenceGroup>[] = [
    { key: "licence", header: t("licences.licence"), render: (group) => group.licence },
    { key: "count", header: t("licences.count"), numeric: true, render: (group) => group.count },
  ];
  return (
    <div class="flex flex-col gap-4">
      <p>{t("licences.audited", { total: report.audited })}</p>
      <Table
        caption={t("licences.caption")}
        rows={report.groups}
        rowKey={(group) => group.licence}
        columns={columns}
      />
      <div class="border-y border-rule">
        {report.groups.map((group) => (
          <PackageGroup key={group.licence} group={group} />
        ))}
      </div>
    </div>
  );
}
