import type { Language } from "@overpass/shared";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { Button } from "../components/ui";
import { localizedPath } from "../layout";

type Props = { language: Language; onTry: () => void };

/** The promise across the column, then a ruled row with the sentence and the one primary action. */
export function Hero({ language, onTry }: Props): JSX.Element {
  const { t } = useTranslation();
  return (
    <div>
      <div class="pb-8 pt-10 lg:pb-9 lg:pt-12">
        <h1 class="home-promise">{t("app.tagline")}</h1>
      </div>
      <div class="grid border-t border-rule md:grid-cols-[7fr_5fr]">
        <p class="max-w-[60ch] py-5 text-[18px] leading-[1.55] md:pr-8">{t("app.intro")}</p>
        <div class="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-rule py-5 md:border-l md:border-t-0 md:pl-8">
          <Button variant="primary" onClick={onTry}>
            {t("app.demo")}
          </Button>
          <a
            class="inline-flex min-h-tap items-center font-medium"
            href={localizedPath(language, "/routes")}
          >
            {t("app.routes")}
          </a>
        </div>
      </div>
    </div>
  );
}
