import type { ApiError, TokenSummary } from "@overpass/shared";
import type { JSX } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { Skeleton } from "../../components/ui";
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
    if (result.error === null) setTokens(result.data);
    else setError(result.error);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const revoke = async (token: TokenSummary) => {
    const result = await apiRequest<null>("DELETE", `/v1/tokens/${token.id}`);
    setError(result.error ?? undefined);
    await load();
  };
  return (
    <SettingsSection heading={t("tokens.heading")} intro={t("tokens.intro")}>
      <TokenCreate onCreated={() => void load()} />
      <h3 class="mb-4 mt-10 text-h3 font-semibold">{t("tokens.list")}</h3>
      <FormAlert error={error} />
      {tokens === undefined ? (
        <Skeleton title={false} />
      ) : (
        <TokenList tokens={tokens} onRevoke={(token) => void revoke(token)} />
      )}
    </SettingsSection>
  );
}
