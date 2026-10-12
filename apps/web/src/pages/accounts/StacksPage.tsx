import type { ApiError, Me } from "@overpass/shared";
import type { JSX } from "preact";
import { useLocation } from "preact-iso";
import { useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Button, ButtonLink, Choice } from "../../components/ui";
import { FormAlert, StackChoices } from "../../forms";
import { localizedPath } from "../../layout/nav";
import { apiRequest, RequireSession, useSession } from "../../session";
import { AuthLayout } from "./AuthLayout";

function useStacksStep(dashboard: string) {
  const { route } = useLocation();
  const { setMe } = useSession();
  const [stacks, setStacks] = useState<string[]>([]);
  const [newsletter, setNewsletter] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | undefined>(undefined);
  const save = async () => {
    setBusy(true);
    const result = await apiRequest<Me>("PATCH", "/v1/me", { stacks, newsletter });
    setBusy(false);
    if (result.error !== null) {
      setError(result.error);
      return;
    }
    setMe(result.data);
    route(dashboard);
  };
  return { stacks, setStacks, newsletter, setNewsletter, busy, error, save };
}

function StacksForm(): JSX.Element {
  const { t } = useTranslation("accounts");
  const dashboard = localizedPath(useLanguage(), "/dashboard");
  const step = useStacksStep(dashboard);
  return (
    <form
      class="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        void step.save();
      }}
    >
      <FormAlert error={step.error} />
      <StackChoices legend={t("stacks.legend")} value={step.stacks} onChange={step.setStacks} />
      <div>
        <Choice
          type="checkbox"
          label={t("stacks.newsletter")}
          checked={step.newsletter}
          aria-describedby="newsletter-help"
          onChange={() => {
            step.setNewsletter(!step.newsletter);
          }}
        />
        <p id="newsletter-help" class="mt-2 text-caption text-ink-2">
          {t("stacks.newsletterHelp")}
        </p>
      </div>
      <div class="flex flex-wrap gap-3">
        <Button type="submit" variant="primary" loading={step.busy}>
          {t("stacks.submit")}
        </Button>
        <ButtonLink variant="ghost" href={dashboard}>
          {t("stacks.skip")}
        </ButtonLink>
      </div>
    </form>
  );
}

/** Step two of two: optional stacks and the newsletter box, unticked by default. */
export function StacksPage(): JSX.Element {
  const { t } = useTranslation("accounts");
  return (
    <RequireSession>
      {() => (
        <AuthLayout title={t("stacks.title")} intro={t("stacks.intro")}>
          <StacksForm />
        </AuthLayout>
      )}
    </RequireSession>
  );
}
