import type { ApiError } from "@overpass/shared";
import { useEffect, useRef, useState } from "preact/hooks";
import { apiRequest } from "../../session";
import { tokenFromHash } from "../accounts";

export type LinkOutcome =
  { status: "working" } | { status: "done" } | { status: "failed"; error: ApiError | undefined };

/** Sends the token of an e-mailed link once; an absent token fails without calling the API. */
export function useLinkToken(path: string): LinkOutcome {
  const [outcome, setOutcome] = useState<LinkOutcome>({ status: "working" });
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    const token = tokenFromHash(location.hash);
    // The token is a credential: keep it out of the history and of shared screenshots.
    history.replaceState(null, "", location.pathname);
    if (token === undefined) {
      setOutcome({ status: "failed", error: undefined });
      return;
    }
    void apiRequest("POST", path, { token }).then(({ error }) => {
      setOutcome(error === null ? { status: "done" } : { status: "failed", error });
    });
  }, [path]);
  return outcome;
}
