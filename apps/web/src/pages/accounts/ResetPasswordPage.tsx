import { resetInput } from "@overpass/shared";
import type { JSX } from "preact";
import { useMemo, useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Button, ButtonLink } from "../../components/ui";
import { FormAlert, TextField, useForm, useSubmit } from "../../forms";
import { localizedPath } from "../../layout/nav";
import { apiRequest } from "../../session";
import { AuthLayout } from "./AuthLayout";

/** The token travels in the URL fragment, which browsers never send to a server. */
export function tokenFromHash(hash: string): string | undefined {
  const token = new URLSearchParams(hash.replace(/^#/, "")).get("token");
  return token === null || token === "" ? undefined : token;
}

function ResetForm({ token, onDone }: { token: string; onDone: () => void }): JSX.Element {
  const { t } = useTranslation("accounts");
  const form = useForm(resetInput, { token, password: "" });
  const { busy, onSubmit } = useSubmit({
    validate: form.validate,
    send: (data) => apiRequest<null>("POST", "/v1/auth/reset", data),
    onError: (error) => {
      form.showApiError(error);
    },
    onSuccess: onDone,
  });
  return (
    <form class="flex flex-col gap-6" noValidate onSubmit={onSubmit}>
      <FormAlert error={form.formError} />
      <TextField
        id="password"
        type="password"
        autocomplete="new-password"
        label={t("fields.newPassword")}
        help={t("fields.passwordHelp")}
        form={form}
      />
      <Button type="submit" variant="primary" loading={busy} class="self-start">
        {t("reset.submit")}
      </Button>
    </form>
  );
}

export function ResetPasswordPage(): JSX.Element {
  const { t } = useTranslation("accounts");
  const language = useLanguage();
  const token = useMemo(
    () => tokenFromHash(typeof location === "undefined" ? "" : location.hash),
    [],
  );
  const [done, setDone] = useState(false);
  if (token === undefined || done) {
    const [title, text, href, label] = done
      ? [t("reset.doneTitle"), t("reset.done"), "/sign-in", t("reset.signIn")]
      : [t("reset.missingTitle"), t("reset.missing"), "/forgot-password", t("reset.askAgain")];
    return (
      <AuthLayout title={title}>
        <p role="status">{text}</p>
        <ButtonLink variant="primary" class="mt-6" href={localizedPath(language, href)}>
          {label}
        </ButtonLink>
      </AuthLayout>
    );
  }
  return (
    <AuthLayout title={t("reset.title")} intro={t("reset.intro")}>
      <ResetForm
        token={token}
        onDone={() => {
          setDone(true);
        }}
      />
    </AuthLayout>
  );
}
