import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";

const steps = ["token", "config", "ask"] as const;

/** Three ruled columns from 768 px, one under the other below. */
export function QuickStart(): JSX.Element {
  const { t } = useTranslation("docs");
  const language = useLanguage();
  const targets = { token: `/${language}/settings#tokens`, config: "#editors", ask: "#example" };
  return (
    <>
      <p class="max-w-prose">{t("start.intro")}</p>
      <ol class="grid border-y border-rule md:grid-cols-3">
        {steps.map((step, index) => (
          <li
            key={step}
            data-step={step}
            class="flex min-w-0 flex-col gap-2 border-t border-rule py-4 first:border-t-0 md:border-l md:border-t-0 md:px-4 md:first:border-l-0 md:first:pl-0"
          >
            <h3 class="text-h3 font-semibold">
              {index + 1}. {t(`start.steps.${step}.title`)}
            </h3>
            <p>{t(`start.steps.${step}.text`)}</p>
            <a class="mt-auto inline-flex min-h-tap items-center self-start" href={targets[step]}>
              {t(`start.steps.${step}.link`)}
            </a>
          </li>
        ))}
      </ol>
    </>
  );
}
