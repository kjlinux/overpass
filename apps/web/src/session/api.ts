import type { ApiError, Envelope } from "@overpass/shared";
import i18next from "i18next";

export type ApiMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export const networkErrorCode = "network";

function networkFailure(): Envelope<never> {
  return { data: null, error: { code: networkErrorCode, message: "" } };
}

/** Calls the API with the session cookie and the interface language; never throws. */
export async function apiRequest<T>(
  method: ApiMethod,
  path: string,
  body?: object,
  customHeaders?: Record<string, string>,
): Promise<Envelope<T>> {
  try {
    const response = await fetch(path, {
      method,
      credentials: "same-origin",
      headers: {
        accept: "application/json",
        "accept-language": i18next.language,
        ...(body === undefined ? {} : { "content-type": "application/json" }),
        ...customHeaders,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return (await response.json()) as Envelope<T>;
  } catch {
    return networkFailure();
  }
}

export type { ApiError };
