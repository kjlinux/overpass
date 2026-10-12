import type { JSX } from "preact";
import { useRoute } from "preact-iso";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Button, Skeleton } from "../../components/ui";
import { FormAlert } from "../../forms";
import { Layout } from "../../layout";
import { ErrorPage } from "../errors";
import { usePublicProfile } from "../../session";
import { ProfileDetails } from "./ProfileDetails";

export function PublicProfilePage(): JSX.Element {
  const { t } = useTranslation("profile");
  const language = useLanguage();
  const { params } = useRoute();
  const { state, retry } = usePublicProfile(params["handle"] ?? "");
  if (state.status === "notFound") return <ErrorPage kind="notFound" language={language} />;
  return (
    <Layout language={language}>
      <section class="py-12 md:py-16">
        {state.status === "loading" ? <Skeleton lines={4} /> : null}
        {state.status === "ready" ? <ProfileDetails profile={state.profile} /> : null}
        {state.status === "error" ? (
          <div class="flex flex-col items-start gap-4">
            <FormAlert error={state.error} />
            <Button onClick={() => void retry()}>{t("retry")}</Button>
          </div>
        ) : null}
      </section>
    </Layout>
  );
}
