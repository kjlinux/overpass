import { countryName, stackNames } from "@overpass/shared";
import type { PublicProfile } from "@overpass/shared";
import { FileText } from "lucide-preact";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Chip, EmptyState, Table } from "../../components/ui";
import type { Column } from "../../components/ui";

type Row = { key: keyof PublicProfile["contributions"]; count: number };

function Contributions({ profile }: { profile: PublicProfile }): JSX.Element {
  const { t } = useTranslation("profile");
  const rows: Row[] = (["routes", "checks", "potholes"] as const).map((key) => ({
    key,
    count: profile.contributions[key],
  }));
  const columns: Column<Row>[] = [
    { key: "kind", header: t("kind"), render: (row) => t(row.key) },
    { key: "count", header: t("count"), numeric: true, render: (row) => row.count },
  ];
  if (rows.every((row) => row.count === 0)) {
    return <EmptyState icon={FileText} title={t("emptyTitle")} description={t("emptyText")} />;
  }
  return (
    <Table caption={t("contributions")} rowKey={(row) => row.key} rows={rows} columns={columns} />
  );
}

/** Handle, country, points and stacks, shared by the profile and the member's blog. */
export function ProfileSummary({ profile }: { profile: PublicProfile }): JSX.Element {
  const { t } = useTranslation("profile");
  const language = useLanguage();
  const since = new Intl.DateTimeFormat(language, { dateStyle: "long" }).format(
    new Date(profile.memberSince),
  );
  return (
    <>
      <h1 class="text-h1 font-semibold">{profile.handle}</h1>
      <p class="mt-2 text-ink-2">{t("memberSince", { date: since })}</p>
      <dl class="mt-8 grid border-y border-rule md:grid-cols-3 md:divide-x md:divide-rule">
        <div class="py-4 md:pr-6">
          <dt class="text-caption font-medium text-ink-2">{t("country")}</dt>
          <dd class="mt-1">{countryName(profile.country, language)}</dd>
        </div>
        <div class="border-t border-rule py-4 md:border-t-0 md:px-6">
          <dt class="text-caption font-medium text-ink-2">{t("points")}</dt>
          <dd class="mt-1 text-h2 font-bold tabular-nums">{profile.points}</dd>
        </div>
        <div class="border-t border-rule py-4 md:border-t-0 md:pl-6">
          <dt class="text-caption font-medium text-ink-2">{t("stacks")}</dt>
          <dd class="mt-2 flex flex-wrap gap-2">
            {profile.stacks.length === 0
              ? t("noStacks")
              : profile.stacks.map((id) => (
                  <Chip key={id}>
                    {(stackNames as Record<string, string | undefined>)[id] ?? id}
                  </Chip>
                ))}
          </dd>
        </div>
      </dl>
    </>
  );
}

/** Country, stacks, contributions and points; the e-mail is never part of a public profile. */
export function ProfileDetails({ profile }: { profile: PublicProfile }): JSX.Element {
  const { t } = useTranslation("profile");
  return (
    <>
      <ProfileSummary profile={profile} />
      <h2 class="mt-12 text-h2 font-semibold">{t("contributions")}</h2>
      <p class="mt-2 text-ink-2">{t("pointsCaption")}</p>
      <div class="mt-6">
        <Contributions profile={profile} />
      </div>
    </>
  );
}
