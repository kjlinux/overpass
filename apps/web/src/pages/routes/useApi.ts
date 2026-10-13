import type { ApiError } from "@overpass/shared";
import { useCallback, useEffect, useState } from "preact/hooks";
import { apiRequest } from "../../session";

export type Loaded<T> =
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "notFound" }
  | { status: "error"; error: ApiError };

/** Loads a GET resource whenever its path changes; refresh keeps the shown data meanwhile. */
export function useApi<T>(path: string | null) {
  const [state, setState] = useState<Loaded<T>>({ status: "loading" });
  const load = useCallback(
    async (quiet = false) => {
      if (path === null) return;
      if (!quiet) setState({ status: "loading" });
      const result = await apiRequest<T>("GET", path);
      if (result.error === null) setState({ status: "ready", data: result.data });
      else if (result.error.code === "not_found") setState({ status: "notFound" });
      else setState({ status: "error", error: result.error });
    },
    [path],
  );
  useEffect(() => {
    void load();
  }, [load]);
  return { state, reload: () => load(), refresh: () => load(true) };
}
