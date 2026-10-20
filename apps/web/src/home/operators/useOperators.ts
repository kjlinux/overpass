import { useEffect, useState } from "preact/hooks";
import { apiRequest } from "../../session";
import { parseOperators } from "./view";
import type { OperatorsState } from "./view";

/** Reads the simulated operators once, after the first render of the section below the fold. */
export function useOperators(): OperatorsState {
  const [state, setState] = useState<OperatorsState>({ status: "loading" });
  useEffect(() => {
    let live = true;
    void apiRequest<unknown>("GET", "/v1/services").then(({ data }) => {
      if (!live) return;
      const operators = parseOperators(data);
      setState(operators === null ? { status: "error" } : { status: "ready", operators });
    });
    return () => {
      live = false;
    };
  }, []);
  return state;
}
