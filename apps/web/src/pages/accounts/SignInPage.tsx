import { loginInput } from "@overpass/shared";
import type { Me } from "@overpass/shared";
import type { JSX } from "preact";
import { useLocation } from "preact-iso";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Button } from "../../components/ui";
import { FormAlert, TextField, useForm, useSubmit } from "../../forms";
import { localizedPath } from "../../layout/nav";
import { apiRequest, safeNext, useSession } from "../../session";
import { AuthLayout } from "./AuthLayout";

function useSignIn() {
  const language = useLanguage();
  const { route, query } = useLocation();
  const { setMe } = useSession();
  const form = useForm(loginInput, { email: "", password: "" });
  const submit = useSubmit({
    validate: form.validate,
    send: (data) => apiRequest<Me>("POST", "/v1/auth/login", data),
    onError: (error) => {
      form.showApiError(error);
    },
    onSuccess: (me) => {
      setMe(me);
      route(safeNext(query["next"] ?? null, localizedPath(language, "/dashboard")));
    },
  });
  return { form, ...submit };
}

export function SignInPage(): JSX.Element {
  const { t } = useTranslation("accounts");
  const language = useLanguage();
  const { form, busy, onSubmit } = useSignIn();
  const signUp = <a href={localizedPath(language, "/sign-up")}>{t("signIn.signUp")}</a>;
  return (
    <AuthLayout
      title={t("signIn.title")}
      footer={
        <>
          {t("signIn.noAccount")} {signUp}
        </>
      }
    >
      <form class="flex flex-col gap-6" noValidate onSubmit={onSubmit}>
        <FormAlert error={form.formError} />
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
          autocomplete="current-password"
          label={t("fields.password")}
          form={form}
        />
        <div class="flex flex-wrap items-center justify-between gap-4">
          <Button type="submit" variant="primary" loading={busy}>
            {t("signIn.submit")}
          </Button>
          <a href={localizedPath(language, "/forgot-password")}>{t("signIn.forgot")}</a>
        </div>
      </form>
    </AuthLayout>
  );
}
