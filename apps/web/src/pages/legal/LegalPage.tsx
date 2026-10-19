import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Layout } from "../../layout";
import { licenceReport } from "./licenceReport";
import { LicenceList } from "./LicenceList";
import { fontLicences, licenceUrl, repositoryUrl } from "./links";
import { FieldList, PageHead, PageSection, Placeholder } from "./PageSection";

function Publisher(): JSX.Element {
  const { t } = useTranslation("legal");
  const missing = <Placeholder label={t("placeholder")} />;
  return (
    <FieldList
      fields={[
        { term: t("publisher.team"), value: t("publisher.teamValue") },
        { term: t("publisher.members"), value: t("publisher.membersValue") },
        { term: t("publisher.legalForm"), value: missing },
        { term: t("publisher.contact"), value: missing },
        { term: t("publisher.director"), value: missing },
      ]}
    />
  );
}

function Hosting(): JSX.Element {
  const { t } = useTranslation("legal");
  const missing = <Placeholder label={t("placeholder")} />;
  return (
    <FieldList
      fields={[
        { term: t("hosting.provider"), value: t("hosting.providerValue") },
        { term: t("hosting.address"), value: missing },
        { term: t("hosting.domain"), value: missing },
      ]}
    />
  );
}

function FontLicences(): JSX.Element {
  const { t } = useTranslation("legal");
  return (
    <ul class="m-0 flex list-none flex-wrap gap-x-6 p-0">
      {fontLicences.map((font) => (
        <li key={font.href}>
          <a href={font.href} class="inline-flex min-h-tap items-center">
            {t("code.fontLicence", { font: font.name })}
          </a>
        </li>
      ))}
    </ul>
  );
}

function SourceCode(): JSX.Element {
  const { t } = useTranslation("legal");
  return (
    <>
      <FieldList
        fields={[
          {
            term: t("code.repository"),
            value: (
              <a
                href={repositoryUrl}
                class="inline-flex min-h-tap items-center [overflow-wrap:anywhere]"
              >
                {repositoryUrl}
              </a>
            ),
          },
          {
            term: t("code.licence"),
            value: (
              <a href={licenceUrl} class="inline-flex min-h-tap items-center">
                {t("code.licenceValue")}
              </a>
            ),
          },
          { term: t("code.cliTerm"), value: t("code.cli") },
        ]}
      />
      <p>{t("code.fonts")}</p>
      <FontLicences />
    </>
  );
}

/** Publisher, hosting, source code and the generated licence audit of every component. */
export function LegalPage(): JSX.Element {
  const { t } = useTranslation("legal");
  const language = useLanguage();
  return (
    <Layout language={language}>
      <div class="flex flex-col gap-12 py-12 md:py-16">
        <PageHead title={t("legal.title")} intro={t("legal.intro")} />
        <PageSection id="publisher" title={t("publisher.heading")}>
          <Publisher />
        </PageSection>
        <PageSection id="hosting" title={t("hosting.heading")}>
          <p>{t("hosting.text")}</p>
          <Hosting />
        </PageSection>
        <PageSection id="code" title={t("code.heading")}>
          <SourceCode />
        </PageSection>
        <PageSection id="licences" title={t("licences.heading")}>
          <p>{t("licences.intro")}</p>
          <LicenceList report={licenceReport} />
        </PageSection>
      </div>
    </Layout>
  );
}
