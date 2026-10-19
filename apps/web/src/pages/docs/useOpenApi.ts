import { useEffect, useState } from "preact/hooks";
import { useLanguage } from "../../app/useLanguage";
import { referenceOf } from "./openapi";
import type { Reference } from "./openapi";

export const openApiPath = "/v1/sandbox/openapi.json";

export type OpenApiState =
  { status: "loading" } | { status: "error" } | { status: "ready"; reference: Reference };

/** The published OpenAPI document sits outside the API envelope, so it is fetched directly. */
export function useOpenApi(): { state: OpenApiState; reload: () => void } {
  const language = useLanguage();
  const [state, setState] = useState<OpenApiState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    // A late answer for a previous language or attempt must not overwrite the current one.
    const controller = new AbortController();
    const headers = { "accept-language": language };
    setState({ status: "loading" });
    fetch(openApiPath, { headers, signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(String(response.status));
        setState({ status: "ready", reference: referenceOf(await response.json()) });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: "error" });
      });
    return () => {
      controller.abort();
    };
  }, [language, attempt]);
  return {
    state,
    reload: () => {
      setAttempt((count) => count + 1);
    },
  };
}
