import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { ButtonLink, InlineCode } from "../../components/ui";
import { Layout, localizedPath } from "../../layout";
import { DataInventory } from "./DataInventory";
import { PageHead, PageSection, Placeholder } from "./PageSection";

/** Names from apps/api/src/modules/accounts/cookies.ts and apps/web/src/app/language.ts. */
const sessionCookie = "__Host-overpass_session";
const languageKey = "overpass.language";

function Cookies(): JSX.Element {
  const { t } = useTranslation("legal");
  return (
    <>
      <p>{t("cookies.intro")}</p>
      <div class="border-y border-rule py-4">
        <p class="font-semibold">
          <InlineCode>{sessionCookie}</InlineCode>
        </p>
        <p class="mt-2">{t("cookies.session")}</p>
      </div>
      <p>{t("cookies.noTracking")}</p>
      <p>
        {t("cookies.storage")} <InlineCode>{languageKey}</InlineCode>
      </p>
    </>
  );
}

function Deletion(): JSX.Element {
  const { t } = useTranslation("legal");
  const language = useLanguage();
  return (
    <>
      <p>{t("deletion.text")}</p>
      <p>{t("deletion.erased")}</p>
      <p>{t("deletion.kept")}</p>
      <p>{t("deletion.newsletter")}</p>
      <div>
        <ButtonLink variant="primary" href={localizedPath(language, "/settings#account")}>
          {t("deletion.action")}
        </ButtonLink>
      </div>
    </>
  );
}

/** Every piece of data the API stores, the one cookie, and self-service deletion. */
export function PrivacyPage(): JSX.Element {
  const { t } = useTranslation("legal");
  const language = useLanguage();
  return (
    <Layout language={language}>
      <div class="flex flex-col gap-12 py-12 md:py-16">
        <PageHead title={t("privacy.title")} intro={t("privacy.intro")} />
        <PageSection id="data" title={t("data.heading")}>
          <DataInventory />
        </PageSection>
        <PageSection id="cookies" title={t("cookies.heading")}>
          <Cookies />
        </PageSection>
        <PageSection id="deletion" title={t("deletion.heading")}>
          <Deletion />
        </PageSection>
        <PageSection id="contact" title={t("contact.heading")}>
          <p>{t("contact.text")}</p>
          <p>
            <Placeholder label={t("placeholder")} />
          </p>
        </PageSection>
      </div>
    </Layout>
  );
}
