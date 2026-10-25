import type { ApiError, Language, SearchGroup, SearchKind } from "@overpass/shared";
import { useEffect, useRef, useState } from "preact/hooks";
import { apiRequest } from "../../session";
import { searchApiPath } from "./query";

export type Groups = Partial<Record<SearchKind, SearchGroup>>;

export type Preview =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; groups: Groups }
  | { status: "error"; error: ApiError };

export const minLength = 2;
const pauseMs = 200;

/** Searches once typing pauses; a slower answer to an older query never replaces a newer one. */
export function usePreview(q: string, lang: Language): Preview {
  const [preview, setPreview] = useState<Preview>({ status: "idle" });
  const latest = useRef(0);
  useEffect(() => {
    const query = q.trim();
    const request = ++latest.current;
    if (query.length < minLength) {
      setPreview({ status: "idle" });
      return;
    }
    setPreview({ status: "loading" });
    const timer = setTimeout(() => {
      void apiRequest<Groups>("GET", searchApiPath({ q: query }, lang)).then((result) => {
        if (request !== latest.current) return;
        setPreview(
          result.error === null
            ? { status: "ready", groups: result.data }
            : { status: "error", error: result.error },
        );
      });
    }, pauseMs);
    return () => {
      clearTimeout(timer);
    };
  }, [q, lang]);
  return preview;
}
