import type { ApiError, Envelope } from "@overpass/shared";
import i18next from "i18next";

export type ApiMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

/** Code used when the API could not be reached at all. */
export const networkErrorCode = "network";

function networkFailure(): Envelope<never> {
  return { data: null, error: { code: networkErrorCode, message: "" } };
}

/** Calls the API with the session cookie and the interface language; never throws. */
export async function apiRequest<T>(
  method: ApiMethod,
  path: string,
  body?: object,
): Promise<Envelope<T>> {
  try {
    const response = await fetch(path, {
      method,
      credentials: "same-origin",
      headers: {
        accept: "application/json",
        "accept-language": i18next.language,
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return (await response.json()) as Envelope<T>;
  } catch {
    return networkFailure();
  }
}

export type { ApiError };

/** Sends a file as the raw body, typed by the browser; same cookie and failure rules as above. */
export async function apiUpload<T>(path: string, file: Blob): Promise<Envelope<T>> {
  try {
    const response = await fetch(path, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        accept: "application/json",
        "accept-language": i18next.language,
        "content-type": file.type,
      },
      body: file,
    });
    return (await response.json()) as Envelope<T>;
  } catch {
    return networkFailure();
  }
}
