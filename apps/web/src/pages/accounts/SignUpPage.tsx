import { registerInput } from "@overpass/shared";
import type { Me } from "@overpass/shared";
import type { JSX } from "preact";
import { useLocation } from "preact-iso";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Button } from "../../components/ui";
import { FormAlert, SelectField, TextField, countryOptions, useForm, useSubmit } from "../../forms";
import type { Bindable } from "../../forms";
import { localizedPath } from "../../layout/nav";
import { apiRequest, useSession } from "../../session";
import { AuthLayout } from "./AuthLayout";

function useSignUp() {
  const language = useLanguage();
  const { route } = useLocation();
  const { setMe } = useSession();
  const form = useForm(registerInput, { email: "", password: "", country: "" });
  const submit = useSubmit({
    validate: form.validate,
    send: (data) => apiRequest<Me>("POST", "/v1/auth/register", data),
    onError: (error) => {
      form.showApiError(error, { email_taken: "email" });
    },
    onSuccess: (me) => {
      setMe(me);
      route(localizedPath(language, "/sign-up/stacks"));
    },
  });
  return { form, ...submit };
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
  const { form, busy, onSubmit } = useSignUp();
  const signIn = <a href={localizedPath(language, "/sign-in")}>{t("signUp.signIn")}</a>;
  return (
    <AuthLayout
      title={t("signUp.title")}
      intro={t("signUp.intro")}
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
