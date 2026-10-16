import type { Me } from "@overpass/shared";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Layout } from "../../layout";
import { RequireSession } from "../../session";
import { BlogModerationQueue } from "../blog";
import { ProposalsQueue } from "./ProposalsQueue";
import { ReportsQueue } from "./ReportsQueue";

function Queues({ me }: { me: Me }): JSX.Element {
  const { t } = useTranslation("moderation");
  if (me.role !== "admin") {
    return (
      <section class="py-12 md:py-16">
        <h1 class="text-h1 font-semibold">{t("title")}</h1>
        <p class="mt-2 max-w-prose">{t("adminOnly")}</p>
      </section>
    );
  }
  return (
    <section class="py-12 md:py-16">
      <h1 class="text-h1 font-semibold">{t("title")}</h1>
      <p class="mt-2 max-w-prose text-ink-2">{t("intro")}</p>
      <div class="mt-8 grid border-t border-rule lg:grid-cols-2 lg:divide-x lg:divide-rule">
        <section aria-labelledby="reports-heading" class="py-8 lg:pr-8">
          <h2 id="reports-heading" class="mb-4 text-h2 font-semibold">
            {t("reports.heading")}
          </h2>
          <ReportsQueue />
        </section>
        <section
          aria-labelledby="proposals-heading"
          class="border-t border-rule py-8 lg:border-t-0 lg:pl-8"
        >
          <h2 id="proposals-heading" class="mb-4 text-h2 font-semibold">
            {t("proposals.heading")}
          </h2>
          <ProposalsQueue />
        </section>
      </div>
      <section aria-labelledby="blog-reports-heading" class="border-t border-rule py-8">
        <h2 id="blog-reports-heading" class="mb-4 text-h2 font-semibold">
          {t("blog.heading")}
        </h2>
        <BlogModerationQueue />
      </section>
    </section>
  );
}

/** The moderation queue: reported content first, then the proposed services. */
export function ModerationPage(): JSX.Element {
  const language = useLanguage();
  return (
    <Layout language={language}>
      <RequireSession>{(me) => <Queues me={me} />}</RequireSession>
    </Layout>
  );
}
