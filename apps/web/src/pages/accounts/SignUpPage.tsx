import { registerInput } from "@overpass/shared";
import type { JSX } from "preact";
import { useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Button } from "../../components/ui";
import { FormAlert, SelectField, TextField, countryOptions, useForm, useSubmit } from "../../forms";
import type { Bindable } from "../../forms";
import { localizedPath } from "../../layout/nav";
import { apiRequest } from "../../session";
import { AuthLayout } from "./AuthLayout";

function useSignUp() {
  const [sentTo, setSentTo] = useState<string | undefined>(undefined);
  const form = useForm(registerInput, { email: "", password: "", country: "" });
  const submit = useSubmit({
    validate: form.validate,
    send: (data) => apiRequest<null>("POST", "/v1/auth/register", data),
    onError: (error) => {
      form.showApiError(error);
    },
    onSuccess: () => {
      setSentTo(form.values["email"]?.trim());
    },
  });
  return { form, sentTo, ...submit };
}

/** The same screen for every address, so it never tells whether an account exists. */
function CheckInbox({ email }: { email: string }): JSX.Element {
  const { t } = useTranslation("accounts");
  return (
    <AuthLayout title={t("signUp.sentTitle")}>
      <p role="status">{t("signUp.sent", { email })}</p>
      <p class="mt-4 text-ink-2">{t("signUp.notReceived")}</p>
    </AuthLayout>
  );
}

function SignUpFields({ form }: { form: Bindable }): JSX.Element {
  const { t } = useTranslation("accounts");
  const language = useLanguage();
  return (
    <>
      <TextField
        id="email"
        type="email"
        autocomplete="email"
        label={t("fields.email")}
        form={form}
      />
      <TextField
        id="password"
        type="password"
        autocomplete="new-password"
        label={t("fields.password")}
        help={t("fields.passwordHelp")}
        form={form}
      />
      <SelectField
        id="country"
        label={t("fields.country")}
        help={t("fields.countryHelp")}
        options={countryOptions(language)}
        form={form}
      />
    </>
  );
}

/** Step one of two: e-mail, password and country, nothing else. */
export function SignUpPage(): JSX.Element {
  const { t } = useTranslation("accounts");
  const language = useLanguage();
  const { form, sentTo, busy, onSubmit } = useSignUp();
  const signIn = <a href={localizedPath(language, "/sign-in")}>{t("signUp.signIn")}</a>;
  if (sentTo !== undefined) return <CheckInbox email={sentTo} />;
  return (
    <AuthLayout
      title={t("signUp.title")}
      footer={
        <>
          {t("signUp.haveAccount")} {signIn}
        </>
      }
    >
      <form class="flex flex-col gap-6" noValidate onSubmit={onSubmit}>
        <FormAlert error={form.formError} />
        <SignUpFields form={form} />
        <Button type="submit" variant="primary" loading={busy} class="self-start">
          {t("signUp.submit")}
        </Button>
      </form>
    </AuthLayout>
  );
}
