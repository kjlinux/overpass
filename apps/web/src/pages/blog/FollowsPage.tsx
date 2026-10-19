import type { Follow } from "@overpass/shared";
import { countryName } from "@overpass/shared";
import { Users } from "lucide-preact";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { EmptyState, Skeleton } from "../../components/ui";
import { FormAlert } from "../../forms";
import { Layout, localizedPath } from "../../layout";
import { RequireSession } from "../../session";
import { formatDate, useApi } from "../routes";

function FollowList(): JSX.Element {
  const { t } = useTranslation("blog");
  const language = useLanguage();
  const { state } = useApi<Follow[]>("/v1/me/follows");
  if (state.status === "error") return <FormAlert error={state.error} />;
  if (state.status !== "ready") return <Skeleton lines={4} />;
  if (state.data.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title={t("follows.emptyTitle")}
        description={t("follows.emptyText")}
      />
    );
  }
  return (
    <ul class="m-0 list-none border-t border-rule p-0">
      {state.data.map((follow) => (
        <li
          key={follow.handle}
          class="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule py-4"
        >
          <a class="font-semibold" href={localizedPath(language, `/blog/@${follow.handle}`)}>
            {follow.handle}
          </a>
          <span class="text-caption text-ink-2">
            {countryName(follow.country, language)} ·{" "}
            {t("follows.since", { date: formatDate(follow.followedAt, language) })}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** The authors whose posts lead the member's For me feed. */
export function FollowsPage(): JSX.Element {
  const { t } = useTranslation("blog");
  const language = useLanguage();
  return (
    <Layout language={language}>
      <RequireSession>
        {() => (
          <section class="py-12 md:py-16">
            <h1 class="text-h1 font-semibold">{t("follows.title")}</h1>
            <p class="mt-2 max-w-prose text-ink-2">{t("follows.intro")}</p>
            <div class="mt-8">
              <FollowList />
            </div>
          </section>
        )}
      </RequireSession>
    </Layout>
  );
}
