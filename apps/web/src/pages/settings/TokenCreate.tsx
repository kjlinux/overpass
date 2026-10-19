import { tokenCreateInput } from "@overpass/shared";
import type { CreatedToken } from "@overpass/shared";
import type { JSX } from "preact";
import { useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { Button, CodeBlock } from "../../components/ui";
import { FormAlert, SelectField, TextField, useForm, useSubmit } from "../../forms";
import { McpConfigTabs } from "../../mcp";
import { apiRequest } from "../../session";

const blank = { name: "", usage: "mcp" };

/** The clear token lives only in this component's state, then is forgotten. */
export function CreatedPanel({
  token,
  onDone,
}: {
  token: CreatedToken;
  onDone: () => void;
}): JSX.Element {
  const { t } = useTranslation("settings");
  return (
    <div class="flex flex-col gap-4 border border-l-4 border-rule-strong border-l-warning p-4">
      <div role="status" class="flex flex-col gap-4">
        <h3 class="text-h3 font-semibold">{t("tokens.createdTitle")}</h3>
        <p>{t("tokens.createdText")}</p>
      </div>
      <CodeBlock code={token.token} />
      {token.usage === "mcp" && (
        <>
          <h4 class="mt-2 font-semibold">{t("tokens.configTitle")}</h4>
          <p>{t("tokens.configText")}</p>
          <McpConfigTabs token={token.token} />
        </>
      )}
      <Button class="self-start" onClick={onDone}>
        {t("tokens.dismiss")}
      </Button>
    </div>
  );
}

export function TokenCreate({ onCreated }: { onCreated: () => void }): JSX.Element {
  const { t } = useTranslation("settings");
  const [created, setCreated] = useState<CreatedToken | undefined>(undefined);
  const form = useForm(tokenCreateInput, blank);
  const { busy, onSubmit } = useSubmit({
    validate: form.validate,
    send: (data) => apiRequest<CreatedToken>("POST", "/v1/tokens", data),
    onError: form.showApiError,
    onSuccess: (token) => {
      setCreated(token);
      form.setValues(blank);
      onCreated();
    },
  });
  if (created !== undefined) {
    return (
      <CreatedPanel
        token={created}
        onDone={() => {
          setCreated(undefined);
        }}
      />
    );
  }
  const usages = [
    { value: "mcp", label: t("tokens.mcp") },
    { value: "api", label: t("tokens.api") },
  ];
  return (
    <form class="flex flex-col gap-6" noValidate onSubmit={onSubmit}>
      <FormAlert error={form.formError} />
      <TextField id="name" label={t("tokens.name")} help={t("tokens.nameHelp")} form={form} />
      <SelectField id="usage" label={t("tokens.usage")} options={usages} form={form} />
      <Button type="submit" variant="primary" loading={busy} class="self-start">
        {t("tokens.submit")}
      </Button>
    </form>
  );
}
