import { countryName } from "@overpass/shared";
import type { AdminAccount, Me } from "@overpass/shared";
import { UserSearch } from "lucide-preact";
import type { JSX } from "preact";
import { useRef, useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Button, Field, Table, TextInput } from "../../components/ui";
import type { Column } from "../../components/ui";
import { localizedPath } from "../../layout";
import { formatDate } from "../routes";
import { PagedView } from "./PagedView";
import { canReactivate, canSuspend } from "./permissions";
import { ReasonDialog } from "./ReasonDialog";
import type { AccountPending } from "./useAccounts";
import { useAccounts } from "./useAccounts";

type Accounts = ReturnType<typeof useAccounts>;

const doneKeys = { suspend: "accounts.suspended", reactivate: "accounts.reactivated" } as const;

function SearchForm({ onSearch }: { onSearch: (query: string) => void }): JSX.Element {
  const { t } = useTranslation("admin");
  const [draft, setDraft] = useState("");
  const submit = (event: Event) => {
    event.preventDefault();
    onSearch(draft);
  };
  return (
    <form role="search" class="flex flex-wrap items-end gap-3" onSubmit={submit}>
      <div class="min-w-0 flex-1 basis-64">
        <Field id="account-search" label={t("accounts.search")}>
          {(control) => (
            <TextInput
              {...control}
              aria-describedby="account-search-help"
              type="search"
              value={draft}
              onInput={(event) => {
                setDraft(event.currentTarget.value);
              }}
            />
          )}
        </Field>
      </div>
      <Button type="submit">{t("accounts.submit")}</Button>
      <p id="account-search-help" class="basis-full text-caption text-ink-2">
        {t("accounts.searchHelp")}
      </p>
    </form>
  );
}

function RowAction(props: { me: Me; account: AdminAccount; ask: Accounts["ask"] }) {
  const { t } = useTranslation("admin");
  const { me, account, ask } = props;
  const action = canSuspend(me, account)
    ? "suspend"
    : canReactivate(me, account)
      ? "reactivate"
      : null;
  if (action === null) return null;
  return (
    <Button
      variant="ghost"
      aria-label={`${t(`accounts.${action}`)} ${account.handle}`}
      onClick={() => {
        ask({ account, action });
      }}
    >
      {t(`accounts.${action}`)}
    </Button>
  );
}

function HandleLink({ handle }: { handle: string }): JSX.Element {
  const language = useLanguage();
  return (
    <a
      class="inline-flex min-h-tap items-center whitespace-nowrap"
      href={localizedPath(language, `/members/${handle}`)}
    >
      {handle}
    </a>
  );
}

function useColumns(me: Me, ask: Accounts["ask"]): Column<AdminAccount>[] {
  const { t } = useTranslation("admin");
  const language = useLanguage();
  const state = (account: AdminAccount) =>
    account.suspendedAt === null
      ? t("accounts.active")
      : t("accounts.suspendedSince", { date: formatDate(account.suspendedAt, language) });
  return [
    {
      key: "handle",
      header: t("accounts.handle"),
      render: (row) => <HandleLink handle={row.handle} />,
    },
    { key: "email", header: t("accounts.email"), render: (row) => row.email },
    { key: "role", header: t("accounts.role"), render: (row) => t(`accounts.roles.${row.role}`) },
    {
      key: "country",
      header: t("accounts.country"),
      render: (row) => countryName(row.country, language),
    },
    {
      key: "created",
      header: t("accounts.createdAt"),
      render: (row) => <span class="whitespace-nowrap">{formatDate(row.createdAt, language)}</span>,
    },
    {
      key: "state",
      header: t("accounts.state"),
      render: (row) => <span class="whitespace-nowrap">{state(row)}</span>,
    },
    {
      key: "actions",
      header: t("accounts.actions"),
      render: (row) => <RowAction me={me} account={row} ask={ask} />,
    },
  ];
}

function AccountDialog({ accounts }: { accounts: Accounts }): JSX.Element {
  const { t } = useTranslation("admin");
  const last = useRef<AccountPending | null>(null);
  if (accounts.pending !== null) last.current = accounts.pending;
  const action = last.current?.action ?? "reactivate";
  const handle = last.current?.account.handle ?? "";
  const suspend = action === "suspend";
  const reason = {
    rule: "required" as const,
    label: t("accounts.reason"),
    help: t("accounts.reasonHelp"),
  };
  return (
    <ReasonDialog
      open={accounts.pending !== null}
      title={t(`accounts.${action}Title`, { handle })}
      text={t(`accounts.${action}Text`)}
      confirmLabel={t(`accounts.${action}`)}
      destructive={suspend}
      reason={suspend ? reason : undefined}
      busy={accounts.busy}
      error={accounts.failure}
      onConfirm={(text) => void accounts.confirm(text)}
      onCancel={() => {
        accounts.ask(null);
      }}
    />
  );
}

/** Search by handle or e-mail prefix; suspension asks for a reason, never for admins or oneself. */
export function AccountsTab({ me }: { me: Me }): JSX.Element {
  const { t } = useTranslation("admin");
  const accounts = useAccounts();
  const columns = useColumns(me, accounts.ask);
  const done = accounts.done;
  const empty = {
    icon: UserSearch,
    title: t("accounts.emptyTitle"),
    description: t("accounts.emptyText"),
  };
  return (
    <section aria-labelledby="accounts-heading" class="flex flex-col gap-6 px-4 py-8 md:px-6">
      <h2 id="accounts-heading" class="text-h2 font-semibold">
        {t("accounts.heading")}
      </h2>
      <SearchForm onSearch={accounts.setQuery} />
      <p role="status" class="text-success empty:hidden">
        {done === null ? "" : t(doneKeys[done.action], { handle: done.account.handle })}
      </p>
      <PagedView state={accounts.state} more={accounts.more} retry={accounts.retry} empty={empty}>
        {(items) => (
          <Table
            caption={t("accounts.caption")}
            columns={columns}
            rows={items}
            rowKey={(row) => row.id}
          />
        )}
      </PagedView>
      <AccountDialog accounts={accounts} />
    </section>
  );
}
