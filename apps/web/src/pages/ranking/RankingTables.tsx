import { countryName } from "@overpass/shared";
import type { CountryRank, DeveloperRank } from "@overpass/shared";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Flag, LevelBadge, Table } from "../../components/ui";
import type { Column } from "../../components/ui";
import { localizedPath } from "../../layout";

const strong = (value: number) => <span class="font-bold tabular-nums">{value}</span>;

export function CountryTable({ rows }: { rows: CountryRank[] }): JSX.Element {
  const { t } = useTranslation("ranking");
  const language = useLanguage();
  const columns: Column<CountryRank>[] = [
    { key: "rank", header: t("columns.rank"), numeric: true, render: (row) => strong(row.rank) },
    {
      key: "country",
      header: t("columns.country"),
      render: (row) => <Flag country={row.country} name={countryName(row.country, language)} />,
    },
    {
      key: "points",
      header: t("columns.points"),
      numeric: true,
      render: (row) => strong(row.points),
    },
    {
      key: "developers",
      header: t("columns.developers"),
      numeric: true,
      render: (row) => row.developers,
    },
  ];
  return (
    <Table
      caption={t("countries.heading")}
      columns={columns}
      rows={rows}
      rowKey={(row) => row.country}
    />
  );
}

export function DeveloperTable({ rows }: { rows: DeveloperRank[] }): JSX.Element {
  const { t } = useTranslation("ranking");
  const language = useLanguage();
  const columns: Column<DeveloperRank>[] = [
    { key: "rank", header: t("columns.rank"), numeric: true, render: (row) => strong(row.rank) },
    {
      key: "handle",
      header: t("columns.developer"),
      render: (row) => <a href={localizedPath(language, `/members/${row.handle}`)}>{row.handle}</a>,
    },
    {
      key: "country",
      header: t("columns.country"),
      render: (row) => <Flag country={row.country} name={countryName(row.country, language)} />,
    },
    {
      key: "level",
      header: t("columns.level"),
      render: (row) => (row.level === null ? null : <LevelBadge level={row.level} />),
    },
    {
      key: "points",
      header: t("columns.points"),
      numeric: true,
      render: (row) => strong(row.points),
    },
  ];
  return (
    <Table
      caption={t("developers.heading")}
      columns={columns}
      rows={rows}
      rowKey={(row) => row.handle}
    />
  );
}
