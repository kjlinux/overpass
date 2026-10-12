import type { TokenSummary } from "@overpass/shared";
import { KeyRound } from "lucide-preact";
import type { JSX } from "preact";
import { useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Button, ConfirmDialog, EmptyState, Table } from "../../components/ui";
import type { Column } from "../../components/ui";

type Props = { tokens: TokenSummary[]; onRevoke: (token: TokenSummary) => void };

function useColumns(onAsk: (token: TokenSummary) => void): Column<TokenSummary>[] {
  const { t } = useTranslation("settings");
  const language = useLanguage();
  const date = (iso: string | null) =>
    iso === null
      ? t("tokens.never")
      : new Intl.DateTimeFormat(language, { dateStyle: "medium" }).format(new Date(iso));
  return [
    { key: "name", header: t("tokens.name"), render: (token) => token.name },
    { key: "usage", header: t("tokens.usage"), render: (token) => t(`tokens.${token.usage}`) },
    { key: "created", header: t("tokens.created"), render: (token) => date(token.createdAt) },
    { key: "used", header: t("tokens.lastUsed"), render: (token) => date(token.lastUsedAt) },
    {
      key: "revoke",
      header: t("tokens.revoke"),
      render: (token) => (
        <Button
          variant="ghost"
          aria-label={t("tokens.revokeLabel", { name: token.name })}
          onClick={() => {
            onAsk(token);
          }}
        >
          {t("tokens.revoke")}
        </Button>
      ),
    },
  ];
}

/** Active tokens; revoking one always goes through a confirmation. */
export function TokenList({ tokens, onRevoke }: Props): JSX.Element {
  const { t } = useTranslation("settings");
  const [pending, setPending] = useState<TokenSummary | undefined>(undefined);
  const columns = useColumns(setPending);
  if (tokens.length === 0) {
    return (
      <EmptyState
        icon={KeyRound}
        title={t("tokens.emptyTitle")}
        description={t("tokens.emptyText")}
      />
    );
  }
  return (
    <>
      <Table
        caption={t("tokens.list")}
        rows={tokens}
        rowKey={(token) => token.id}
        columns={columns}
      />
      <ConfirmDialog
        open={pending !== undefined}
        destructive
        title={t("tokens.revokeTitle", { name: pending?.name ?? "" })}
        description={t("tokens.revokeText")}
        confirmLabel={t("tokens.revoke")}
        onConfirm={() => {
          if (pending !== undefined) onRevoke(pending);
          setPending(undefined);
        }}
        onCancel={() => {
          setPending(undefined);
        }}
      />
    </>
  );
}
