import { proposalCreateInput, serviceCategories } from "@overpass/shared";
import type { Proposal } from "@overpass/shared";
import type { JSX } from "preact";
import { useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Button, ButtonLink } from "../../components/ui";
import { FormAlert, SelectField, TextField, countryOptions, useForm, useSubmit } from "../../forms";
import { Layout, localizedPath } from "../../layout";
import { RequireSession, apiRequest } from "../../session";

const initial = { name: "", category: "", country: "", docsUrl: "" };

function Sent({ proposal }: { proposal: Proposal }): JSX.Element {
  const { t } = useTranslation("requests");
  const language = useLanguage();
  return (
    <div role="status" class="flex max-w-prose flex-col items-start gap-4 border border-rule p-6">
      <h2 class="text-h3 font-semibold">{t("propose.sentTitle")}</h2>
      <p>{t("propose.sentText", { name: proposal.name })}</p>
      <ButtonLink href={localizedPath(language, "/dashboard")}>{t("propose.dashboard")}</ButtonLink>
    </div>
  );
}

function ProposeForm({ onSent }: { onSent: (proposal: Proposal) => void }): JSX.Element {
  const { t } = useTranslation("requests");
  const language = useLanguage();
  const form = useForm(proposalCreateInput, initial);
  const { busy, onSubmit } = useSubmit({
    validate: form.validate,
    send: (data) => apiRequest<Proposal>("POST", "/v1/service-proposals", data),
    onError: (error) => {
      form.showApiError(error, { service_exists: "name" });
    },
    onSuccess: onSent,
  });
  const categories = serviceCategories.map((value) => ({ value, label: t(`category.${value}`) }));
  return (
    <form class="flex max-w-prose flex-col gap-6" noValidate onSubmit={onSubmit}>
      <FormAlert error={form.formError} />
      <TextField id="name" label={t("propose.name")} form={form} />
      <SelectField id="category" label={t("propose.category")} form={form} options={categories} />
      <SelectField
        id="country"
        label={t("propose.country")}
        form={form}
        options={countryOptions(language)}
      />
      <TextField
        id="docsUrl"
        label={t("propose.docsUrl")}
        help={t("propose.docsHelp")}
        form={form}
      />
      <Button type="submit" variant="primary" loading={busy} class="self-start">
        {t("propose.submit")}
      </Button>
    </form>
  );
}

/** A member proposes a missing service; the team reviews it and answers by e-mail. */
export function ProposePage(): JSX.Element {
  const { t } = useTranslation("requests");
  const language = useLanguage();
  const [sent, setSent] = useState<Proposal | null>(null);
  return (
    <Layout language={language}>
      <RequireSession>
        {() => (
          <section class="py-12 md:py-16">
            <h1 class="text-h1 font-semibold">{t("propose.title")}</h1>
            <p class="mt-2 max-w-prose text-ink-2">{t("propose.intro")}</p>
            <div class="mt-8 border-t border-rule pt-8">
              {sent === null ? <ProposeForm onSent={setSent} /> : <Sent proposal={sent} />}
            </div>
          </section>
        )}
      </RequireSession>
    </Layout>
  );
}
