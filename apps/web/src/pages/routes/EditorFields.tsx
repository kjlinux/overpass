import { languageNames, supportedLanguages } from "@overpass/shared";
import type { Service } from "@overpass/shared";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { SelectField, TextField, countryOptions, stackOptions } from "../../forms";
import type { Bindable } from "../../forms";

export type EditorFieldsProps = { form: Bindable; services: Service[]; languageLocked: boolean };

/** Title, service, country, stack and language, in the order an author decides them. */
export function EditorFields({ form, services, languageLocked }: EditorFieldsProps): JSX.Element {
  const { t } = useTranslation("routes");
  const language = useLanguage();
  const serviceOptions = services.map((service) => ({ value: service.slug, label: service.name }));
  const languageOptions = supportedLanguages.map((code) => ({
    value: code,
    label: languageNames[code],
  }));
  return (
    <div class="flex flex-col gap-6">
      <TextField id="title" label={t("editor.title")} help={t("editor.titleHelp")} form={form} />
      <div class="grid gap-6 md:grid-cols-2">
        <SelectField
          id="service"
          label={t("editor.service")}
          options={serviceOptions}
          form={form}
        />
        <SelectField
          id="country"
          label={t("editor.country")}
          options={countryOptions(language)}
          form={form}
        />
        <SelectField id="stack" label={t("editor.stack")} options={stackOptions} form={form} />
        <fieldset disabled={languageLocked} class="m-0 min-w-0 border-0 p-0">
          <SelectField
            id="language"
            label={t("editor.language")}
            help={t(languageLocked ? "editor.languageLocked" : "editor.languageHelp")}
            options={languageOptions}
            form={form}
          />
        </fieldset>
      </div>
    </div>
  );
}
