import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Layout } from "../../layout";
import { ButtonsSection, FieldsSection } from "./ShowcaseControls";
import { CardsSection, CodeSection, TableSection, TabsSection } from "./ShowcaseData";
import { DialogSection, NotificationSection, StatesSection } from "./ShowcaseFeedback";

/** Every component of DESIGN.md, rendered with sample content for review. */
export function ComponentsPage(): JSX.Element {
  const { t } = useTranslation("showcase");
  const language = useLanguage();
  return (
    <Layout language={language}>
      <header class="max-w-prose py-12">
        <h1 class="text-h1 font-semibold">{t("title")}</h1>
        <p class="mt-4">{t("intro")}</p>
      </header>
      <ButtonsSection />
      <FieldsSection />
      <CardsSection />
      <TableSection />
      <TabsSection />
      <DialogSection />
      <NotificationSection />
      <CodeSection />
      <StatesSection />
    </Layout>
  );
}
