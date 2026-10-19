import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Layout } from "../../layout";
import { SubscribeForm } from "../../newsletter";

const steps = ["confirm", "weekly", "unsubscribe"] as const;

/** The public newsletter page: what the digest holds, how consent works, then the form. */
export function NewsletterPage(): JSX.Element {
  const { t } = useTranslation("newsletter");
  const language = useLanguage();
  return (
    <Layout language={language} footerNewsletter={false}>
      <section class="max-w-prose py-12 md:py-16">
        <h1 class="text-h1 font-semibold">{t("page.title")}</h1>
        <p class="mt-2 text-ink-2">{t("page.intro")}</p>
        <h2 class="mt-8 border-t border-rule pt-6 text-h2 font-semibold">{t("page.stepsTitle")}</h2>
        <ol class="mt-4 list-decimal pl-6">
          {steps.map((step) => (
            <li key={step} class="py-1">
              {t(`page.steps.${step}`)}
            </li>
          ))}
        </ol>
        <div class="mt-8 border-t border-rule pt-6">
          <SubscribeForm language={language} />
        </div>
      </section>
    </Layout>
  );
}
