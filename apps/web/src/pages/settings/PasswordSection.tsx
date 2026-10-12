import { passwordChangeInput } from "@overpass/shared";
import type { Me } from "@overpass/shared";
import type { JSX } from "preact";
import { useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui";
import { FormAlert, TextField, useForm, useSubmit } from "../../forms";
import { apiRequest, useSession } from "../../session";
import { SavedNote, SettingsSection } from "./SettingsSection";

const empty = { currentPassword: "", newPassword: "" };

function usePasswordChange() {
  const { setMe } = useSession();
  const [done, setDone] = useState(false);
  const form = useForm(passwordChangeInput, empty);
  const submit = useSubmit({
    validate: () => {
      setDone(false);
      return form.validate();
    },
    send: (data) => apiRequest<Me>("PUT", "/v1/me/password", data),
    onError: (error) => {
      form.showApiError(error, { wrong_password: "currentPassword" });
    },
    onSuccess: (next) => {
      setMe(next);
      form.setValues(empty);
      setDone(true);
    },
  });
  return { form, done, ...submit };
}

export function PasswordSection(): JSX.Element {
  const { t } = useTranslation("settings");
  const { form, done, busy, onSubmit } = usePasswordChange();
  return (
    <SettingsSection heading={t("password.heading")} intro={t("password.intro")}>
      <form class="flex flex-col gap-6" noValidate onSubmit={onSubmit}>
        <FormAlert error={form.formError} />
        <TextField
          id="currentPassword"
          type="password"
          autocomplete="current-password"
          label={t("password.current")}
          form={form}
        />
        <TextField
          id="newPassword"
          type="password"
          autocomplete="new-password"
          label={t("password.new")}
          help={t("password.help")}
          form={form}
        />
        <Button type="submit" variant="primary" loading={busy} class="self-start">
          {t("password.submit")}
        </Button>
        <SavedNote shown={done} text={t("password.done")} />
      </form>
    </SettingsSection>
  );
}
