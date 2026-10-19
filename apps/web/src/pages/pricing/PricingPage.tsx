import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { ButtonLink, Chip } from "../../components/ui";
import { Layout, localizedPath } from "../../layout";

/** Only the free plan exists today; the others list what the spec plans, marked as coming. */
const plans = [
  { key: "free", available: true, features: ["catalogue", "track", "relay", "mcp", "community"] },
  { key: "team", available: false, features: ["everythingFree", "space", "shared"] },
  { key: "enterprise", available: false, features: ["everythingTeam", "support"] },
] as const;

type Plan = (typeof plans)[number];

function PlanColumn({ plan }: { plan: Plan }): JSX.Element {
  const { t } = useTranslation("pricing");
  const language = useLanguage();
  const id = `plan-${plan.key}`;
  return (
    <section
      aria-labelledby={id}
      class="flex flex-col gap-4 border-t border-rule py-6 first:border-t-0 md:border-l md:border-t-0 md:px-6 md:first:border-l-0 md:first:pl-0 md:last:pr-0"
    >
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 id={id} class="text-h2 font-semibold">
          {t(`plans.${plan.key}.name`)}
        </h2>
        <Chip>{t(plan.available ? "available" : "soon")}</Chip>
      </div>
      <p class="text-h3 font-semibold">{t(`plans.${plan.key}.price`)}</p>
      <p class="text-ink-2">{t(`plans.${plan.key}.summary`)}</p>
      <ul class="m-0 flex-1 list-none border-t border-rule p-0">
        {plan.features.map((feature) => (
          <li key={feature} class="border-b border-rule py-3">
            {t(`plans.${plan.key}.features.${feature}`)}
          </li>
        ))}
      </ul>
      {plan.available ? (
        <div>
          <ButtonLink variant="primary" href={localizedPath(language, "/sign-up")}>
            {t("plans.free.action")}
          </ButtonLink>
        </div>
      ) : null}
    </section>
  );
}

/** Free plan available now, Team and Enterprise announced; no checkout and no invented price. */
export function PricingPage(): JSX.Element {
  const { t } = useTranslation("pricing");
  const language = useLanguage();
  return (
    <Layout language={language}>
      <div class="flex flex-col gap-8 py-12 md:py-16">
        <header class="max-w-prose">
          <h1 class="text-h1 font-semibold">{t("title")}</h1>
          <p class="mt-2 text-ink-2">{t("intro")}</p>
        </header>
        <p class="max-w-prose border border-rule-strong bg-surface p-4" role="note">
          <span class="font-semibold">{t("payment.label")}</span> {t("payment.text")}
        </p>
        <div class="grid border-y border-rule md:grid-cols-3">
          {plans.map((plan) => (
            <PlanColumn key={plan.key} plan={plan} />
          ))}
        </div>
        <p class="max-w-prose">
          {t("follow.text")} <a href={localizedPath(language, "/newsletter")}>{t("follow.link")}</a>
        </p>
      </div>
    </Layout>
  );
}
