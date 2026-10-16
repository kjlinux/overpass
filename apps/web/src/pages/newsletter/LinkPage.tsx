import type { ApiError } from "@overpass/shared";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { ButtonLink, Skeleton } from "../../components/ui";
import { FormAlert } from "../../forms";
import { Layout, localizedPath } from "../../layout";
import { useLinkToken } from "./useLinkToken";

type LinkKind = "confirm" | "unsubscribe";

function Failure({ kind, error }: { kind: LinkKind; error: ApiError | undefined }): JSX.Element {
  const { t } = useTranslation("newsletter");
  const shown = error ?? { code: "token_missing", message: t("link.missing") };
  return (
    <>
      <h1 class="text-h1 font-semibold">{t(`${kind}.invalidTitle`)}</h1>
      <div class="mt-6">
        <FormAlert error={shown} />
      </div>
    </>
  );
}

function Outcome({ kind }: { kind: LinkKind }): JSX.Element {
  const { t } = useTranslation("newsletter");
  const outcome = useLinkToken(`/v1/newsletter/${kind}`);
  if (outcome.status === "failed") return <Failure kind={kind} error={outcome.error} />;
  if (outcome.status === "working") {
    return (
      <>
        <h1 class="text-h1 font-semibold">{t(`${kind}.title`)}</h1>
        <p class="mt-2 text-ink-2" role="status">
          {t(`${kind}.working`)}
        </p>
        <Skeleton title={false} lines={2} />
      </>
    );
  }
  return (
    <>
      <h1 class="text-h1 font-semibold">{t(`${kind}.doneTitle`)}</h1>
      <p class="mt-2" role="status">
        {t(`${kind}.done`)}
      </p>
    </>
  );
}

/** Landing page of an e-mailed link: works without a session, then points back to the page. */
export function LinkPage({ kind }: { kind: LinkKind }): JSX.Element {
  const { t } = useTranslation("newsletter");
  const language = useLanguage();
  return (
    <Layout language={language}>
      <section class="max-w-prose py-12 md:py-16">
        <Outcome kind={kind} />
        <ButtonLink class="mt-6" href={localizedPath(language, "/newsletter")}>
          {t("link.back")}
        </ButtonLink>
      </section>
    </Layout>
  );
}

export function NewsletterConfirmPage(): JSX.Element {
  return <LinkPage kind="confirm" />;
}

export function NewsletterUnsubscribePage(): JSX.Element {
  return <LinkPage kind="unsubscribe" />;
}
