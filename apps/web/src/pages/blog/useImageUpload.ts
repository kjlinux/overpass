import { errorMessage } from "@overpass/shared";
import type { ApiError } from "@overpass/shared";
import { useState } from "preact/hooks";
import { useLanguage } from "../../app/useLanguage";
import { apiUpload } from "../../session";
import { checkImage } from "./images";

export type Uploaded = { id: string; url: string };

/** Checks the file in the browser first, then stores it; one upload at a time. */
export function useImageUpload() {
  const language = useLanguage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | undefined>(undefined);
  const upload = async (file: File): Promise<Uploaded | undefined> => {
    const problem = checkImage(file);
    if (problem !== null) {
      setError({ code: problem, message: errorMessage(problem, language) });
      return undefined;
    }
    setBusy(true);
    setError(undefined);
    const result = await apiUpload<Uploaded>("/v1/media", file);
    setBusy(false);
    if (result.error !== null) setError(result.error);
    return result.data ?? undefined;
  };
  return { upload, busy, error };
}
