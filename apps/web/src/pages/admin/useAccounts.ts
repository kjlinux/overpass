import type { AdminAccount, ApiError } from "@overpass/shared";
import { useState } from "preact/hooks";
import { apiRequest } from "../../session";
import { usePaged } from "./usePaged";

export type AccountAction = "suspend" | "reactivate";
export type AccountPending = { account: AdminAccount; action: AccountAction };

const pathOf = (query: string) => {
  const trimmed = query.trim();
  return trimmed === ""
    ? "/v1/admin/accounts"
    : `/v1/admin/accounts?q=${encodeURIComponent(trimmed)}`;
};

/** The searched accounts; a decision replaces the row with the account the API returns. */
export function useAccounts() {
  const [query, setQuery] = useState("");
  const paged = usePaged<AdminAccount>(pathOf(query));
  const [pending, setPending] = useState<AccountPending | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<ApiError | undefined>(undefined);
  const [done, setDone] = useState<AccountPending | null>(null);
  const ask = (next: AccountPending | null) => {
    setFailure(undefined);
    setPending(next);
  };
  const confirm = async (reason: string) => {
    if (pending === null) return;
    const { account, action } = pending;
    const body = action === "suspend" ? { reason } : {};
    setBusy(true);
    const answer = await apiRequest<AdminAccount>(
      "POST",
      `/v1/admin/accounts/${account.id}/${action}`,
      body,
    );
    setBusy(false);
    if (answer.error !== null) {
      setFailure(answer.error);
      return;
    }
    const changed = answer.data;
    paged.update((items) => items.map((item) => (item.id === changed.id ? changed : item)));
    setPending(null);
    setDone(pending);
  };
  return { ...paged, query, setQuery, pending, busy, failure, done, ask, confirm };
}
