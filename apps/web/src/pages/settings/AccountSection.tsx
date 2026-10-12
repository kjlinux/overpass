import { accountDeleteInput } from "@overpass/shared";
import type { JSX } from "preact";
import { useLocation } from "preact-iso";
import { useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Button, ConfirmDialog } from "../../components/ui";
import { FormAlert, TextField, useForm } from "../../forms";
import { localizedPath } from "../../layout/nav";
import { apiRequest, useSession } from "../../session";
import { SettingsSection } from "./SettingsSection";

function useAccountDeletion() {
  const language = useLanguage();
  const { route } = useLocation();
  const { setMe } = useSession();
  const form = useForm(accountDeleteInput, { password: "" });
  const [confirming, setConfirming] = useState(false);
  const ask = (event: Event) => {
    event.preventDefault();
    if (form.validate() !== undefined) setConfirming(true);
  };
  const erase = async () => {
    setConfirming(false);
    const body = { password: form.values["password"] };
    const result = await apiRequest<null>("DELETE", "/v1/me", body);
    if (result.error !== null) {
      form.showApiError(result.error, { wrong_password: "password" });
      return;
    }
    setMe(null);
    route(localizedPath(language, "/"));
  };
  return { form, confirming, setConfirming, ask, erase };
}

/** Asks for the password, then for an explicit confirmation, before erasing anything. */
export function AccountSection(): JSX.Element {
  const { t } = useTranslation("settings");
  const { form, confirming, setConfirming, ask, erase } = useAccountDeletion();
  return (
    <SettingsSection heading={t("account.heading")} intro={t("account.intro")}>
      <form class="flex flex-col gap-6" noValidate onSubmit={ask}>
        <FormAlert error={form.formError} />
        <TextField
          id="password"
          type="password"
          autocomplete="current-password"
          label={t("account.password")}
          form={form}
        />
        <Button type="submit" class="self-start">
          {t("account.submit")}
        </Button>
      </form>
      <ConfirmDialog
        open={confirming}
        destructive
        title={t("account.confirmTitle")}
        description={t("account.confirmText")}
        confirmLabel={t("account.confirm")}
        onConfirm={() => void erase()}
        onCancel={() => {
          setConfirming(false);
        }}
      />
    </SettingsSection>
  );
}
