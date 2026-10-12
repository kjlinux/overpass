import { forgotInput } from "@overpass/shared";
import type { JSX } from "preact";
import { useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Button } from "../../components/ui";
import { FormAlert, TextField, useForm, useSubmit } from "../../forms";
import { localizedPath } from "../../layout/nav";
import { apiRequest } from "../../session";
import { AuthLayout } from "./AuthLayout";

function useForgot() {
  const [sentTo, setSentTo] = useState<string | undefined>(undefined);
  const form = useForm(forgotInput, { email: "" });
  const submit = useSubmit({
    validate: form.validate,
    send: (data) => apiRequest<null>("POST", "/v1/auth/forgot", data),
    onError: (error) => {
      form.showApiError(error);
    },
    onSuccess: () => {
      setSentTo(form.values["email"]?.trim());
    },
  });
  return { form, sentTo, ...submit };
}

/** One field; the answer never says whether the address has an account. */
export function ForgotPasswordPage(): JSX.Element {
  const { t } = useTranslation("accounts");
  const language = useLanguage();
  const { form, sentTo, busy, onSubmit } = useForgot();
  const back = <a href={localizedPath(language, "/sign-in")}>{t("forgot.back")}</a>;
  if (sentTo !== undefined) {
    return (
      <AuthLayout title={t("forgot.sentTitle")} footer={back}>
        <p role="status">{t("forgot.sent", { email: sentTo })}</p>
      </AuthLayout>
    );
  }
  return (
    <AuthLayout title={t("forgot.title")} intro={t("forgot.intro")} footer={back}>
      <form class="flex flex-col gap-6" noValidate onSubmit={onSubmit}>
        <FormAlert error={form.formError} />
        <TextField
          id="email"
          type="email"
          autocomplete="email"
          label={t("fields.email")}
          form={form}
        />
        <Button type="submit" variant="primary" loading={busy} class="self-start">
          {t("forgot.submit")}
        </Button>
      </form>
    </AuthLayout>
  );
}
