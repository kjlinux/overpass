import { errorMessage } from "@overpass/shared";
import type { ComponentChildren, JSX } from "preact";
import { useLanguage } from "../../app/useLanguage";
import { Skeleton } from "../../components/ui";
import { LoadError } from "../../forms";
import type { Loaded } from "./useApi";

export type FetchedProps<T> = {
  api: { state: Loaded<T>; reload: () => Promise<void> };
  /** What stands in while loading; a short skeleton by default. */
  placeholder?: ComponentChildren;
  children: (data: T) => ComponentChildren;
};

/** The one switch over a useApi state: skeleton, error with retry, or the data. */
export function Fetched<T>({ api, placeholder, children }: FetchedProps<T>): JSX.Element {
  const language = useLanguage();
  const { state, reload } = api;
  if (state.status === "ready") return <>{children(state.data)}</>;
  if (state.status === "loading") return <>{placeholder ?? <Skeleton title={false} lines={3} />}</>;
  const error =
    state.status === "error"
      ? state.error
      : { code: "not_found", message: errorMessage("not_found", language) };
  return <LoadError error={error} onRetry={() => void reload()} />;
}
