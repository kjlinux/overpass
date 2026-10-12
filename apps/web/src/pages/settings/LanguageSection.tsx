import { languageNames, profileUpdateInput, supportedLanguages } from "@overpass/shared";
import type { Me } from "@overpass/shared";
import type { JSX } from "preact";
import { useLocation } from "preact-iso";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui";
import { FormAlert, SelectField, useForm, useSubmit } from "../../forms";
import { localizedPath } from "../../layout/nav";
import { apiRequest, useSession } from "../../session";
import { SettingsSection } from "./SettingsSection";

const options = supportedLanguages.map((code) => ({ value: code, label: languageNames[code] }));

/** Saves the language on the account, then reopens the settings in that language. */
export function LanguageSection({ me }: { me: Me }): JSX.Element {
  const { t } = useTranslation("settings");
  const { route } = useLocation();
  const { setMe } = useSession();
  const form = useForm(profileUpdateInput, { language: me.language });
  const { busy, onSubmit } = useSubmit({
    validate: form.validate,
    send: (data) => apiRequest<Me>("PATCH", "/v1/me", data),
    onError: (error) => {
      form.showApiError(error);
    },
    onSuccess: (next) => {
      setMe(next);
      route(localizedPath(next.language, "/settings"));
    },
  });
  return (
    <SettingsSection heading={t("language.heading")}>
      <form class="flex flex-col gap-6" noValidate onSubmit={onSubmit}>
        <FormAlert error={form.formError} />
        <SelectField
          id="language"
          label={t("language.label")}
          help={t("language.help")}
          options={options}
          form={form}
        />
        <Button type="submit" variant="primary" loading={busy} class="self-start">
          {t("language.submit")}
        </Button>
      </form>
    </SettingsSection>
  );
}
