import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { ButtonLink } from "../../components/ui";
import { Layout, localizedPath } from "../../layout";
import { contestUrl, FieldList, PageHead, PageSection, Placeholder, repositoryUrl } from "../legal";

const bricks = ["routes", "track", "mcp"] as const;
const members = ["jude", "bradi"] as const;

function Product(): JSX.Element {
  const { t } = useTranslation("about");
  const language = useLanguage();
  return (
    <>
      <ul class="m-0 list-none border-y border-rule p-0">
        {bricks.map((brick) => (
          <li key={brick} class="border-t border-rule py-3 first:border-t-0">
            <span class="font-semibold">{t(`product.${brick}.name`)}</span>{" "}
            {t(`product.${brick}.text`)}
          </li>
        ))}
      </ul>
      <div>
        <ButtonLink variant="primary" href={localizedPath(language, "/sandbox/demo")}>
          {t("product.action")}
        </ButtonLink>
      </div>
    </>
  );
}

function Team(): JSX.Element {
  const { t } = useTranslation("about");
  return (
    <>
      <p>{t("team.text")}</p>
      <ul class="m-0 list-none border-y border-rule p-0">
        {members.map((member) => (
          <li key={member} class="border-t border-rule py-3 font-semibold first:border-t-0">
            {t(`team.members.${member}`)}
          </li>
        ))}
      </ul>
    </>
  );
}

function Code(): JSX.Element {
  const { t } = useTranslation("about");
  const language = useLanguage();
  return (
    <>
      <p>{t("code.text")}</p>
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
          { term: t("code.licence"), value: <Placeholder label={t("placeholder")} /> },
          {
            term: t("code.components"),
            value: (
              <a
                href={localizedPath(language, "/legal#licences")}
                class="inline-flex min-h-tap items-center [overflow-wrap:anywhere]"
              >
                {t("code.componentsLink")}
              </a>
            ),
          },
        ]}
      />
    </>
  );
}

/** The product in a few lines, the Ghostapi team, the contest and the code licences. */
export function AboutPage(): JSX.Element {
  const { t } = useTranslation("about");
  const language = useLanguage();
  return (
    <Layout language={language}>
      <div class="flex flex-col gap-12 py-12 md:py-16">
        <PageHead title={t("title")} intro={t("intro")} />
        <PageSection id="product" title={t("product.heading")}>
          <Product />
        </PageSection>
        <PageSection id="team" title={t("team.heading")}>
          <Team />
        </PageSection>
        <PageSection id="contest" title={t("contest.heading")}>
          <p>{t("contest.text")}</p>
          <p>
            <a
              href={contestUrl}
              class="inline-flex min-h-tap items-center [overflow-wrap:anywhere]"
            >
              {t("contest.link")}
            </a>
          </p>
        </PageSection>
        <PageSection id="code" title={t("code.heading")}>
          <Code />
        </PageSection>
      </div>
    </Layout>
  );
}
