import type { ApiError, TokenSummary } from "@overpass/shared";
import type { JSX } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { Button, Skeleton } from "../../components/ui";
import { FormAlert } from "../../forms";
import { apiRequest } from "../../session";
import { SettingsSection } from "./SettingsSection";
import { TokenCreate } from "./TokenCreate";
import { TokenList } from "./TokenList";

export function TokensSection(): JSX.Element {
  const { t } = useTranslation("settings");
  const [tokens, setTokens] = useState<TokenSummary[] | undefined>(undefined);
  const [error, setError] = useState<ApiError | undefined>(undefined);
  const load = useCallback(async () => {
    const result = await apiRequest<TokenSummary[]>("GET", "/v1/tokens");
    setError(result.error ?? undefined);
    if (result.error === null) setTokens(result.data);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const revoke = async (token: TokenSummary) => {
    const result = await apiRequest<null>("DELETE", `/v1/tokens/${token.id}`);
    await load();
    if (result.error !== null) setError(result.error);
  };
  return (
    <SettingsSection heading={t("tokens.heading")} intro={t("tokens.intro")}>
      <TokenCreate onCreated={() => void load()} />
      <h3 class="mb-4 mt-10 text-h3 font-semibold">{t("tokens.list")}</h3>
      <FormAlert error={error} />
      {tokens === undefined && error !== undefined ? (
        <Button class="mt-4" onClick={() => void load()}>
          {t("retry")}
        </Button>
      ) : tokens === undefined ? (
        <Skeleton title={false} />
      ) : (
        <TokenList tokens={tokens} onRevoke={(token) => void revoke(token)} />
      )}
    </SettingsSection>
  );
}
