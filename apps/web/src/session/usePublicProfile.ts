import type { ApiError, PublicProfile } from "@overpass/shared";
import { useCallback, useEffect, useState } from "preact/hooks";
import { apiRequest } from "./api";

export type ProfileState =
  | { status: "loading" }
  | { status: "ready"; profile: PublicProfile }
  | { status: "notFound" }
  | { status: "error"; error: ApiError };

/** Loads a public profile by handle and exposes a retry for failures. */
export function usePublicProfile(handle: string) {
  const [state, setState] = useState<ProfileState>({ status: "loading" });
  const load = useCallback(async () => {
    setState({ status: "loading" });
    const result = await apiRequest<PublicProfile>(
      "GET",
      `/v1/users/${encodeURIComponent(handle)}`,
    );
    if (result.error === null) setState({ status: "ready", profile: result.data });
    else if (result.error.code === "not_found") setState({ status: "notFound" });
    else setState({ status: "error", error: result.error });
  }, [handle]);
  useEffect(() => {
    void load();
  }, [load]);
  return { state, retry: load };
}
