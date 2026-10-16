import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { InlineCode, Table } from "../../components/ui";

const tools = ["search_routes", "get_route", "list_potholes", "list_services"] as const;

type Tool = (typeof tools)[number];

/** The section 10 tool table, plus why member content is fenced as data. */
export function ToolsTable(): JSX.Element {
  const { t } = useTranslation("docs");
  const columns = [
    {
      key: "name",
      header: t("tools.name"),
      render: (tool: Tool) => <InlineCode>{tool}</InlineCode>,
    },
    {
      key: "input",
      header: t("tools.input"),
      render: (tool: Tool) => t(`tools.rows.${tool}.input`),
    },
    {
      key: "output",
      header: t("tools.output"),
      render: (tool: Tool) => t(`tools.rows.${tool}.output`),
    },
  ];
  return (
    <>
      <Table
        caption={t("tools.caption")}
        columns={columns}
        rows={[...tools]}
        rowKey={(tool) => tool}
      />
      <p class="max-w-prose">{t("tools.safety")}</p>
    </>
  );
}
