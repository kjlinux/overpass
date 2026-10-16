import { envelopeSchema } from "@overpass/shared";
import type { Language } from "@overpass/shared";
import { z } from "zod";

const timeoutMs = 10_000;

/** A failed API call; `code` is a stable API error code or one of the client codes. */
export class ApiCallError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "ApiCallError";
  }
}

export type ApiClientOptions = {
  baseUrl: string;
  token: string;
  language: Language;
  fetch?: typeof globalThis.fetch;
};

export type Query = Record<string, string | number | undefined>;

function urlOf(baseUrl: string, path: string, query: Query): string {
  const url = new URL(path, baseUrl);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  }
  return url.toString();
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new ApiCallError("bad_response");
  }
}

/** The only way the MCP server reaches data: the public API, as the developer. */
export function createApiClient(options: ApiClientOptions) {
  const fetch = options.fetch ?? globalThis.fetch;
  const headers = {
    authorization: `Bearer ${options.token}`,
    "accept-language": options.language,
    accept: "application/json",
  };
  const send = async (url: string): Promise<Response> => {
    try {
      return await fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
    } catch {
      throw new ApiCallError("api_unreachable");
    }
  };
  const get = async <T extends z.ZodType>(path: string, schema: T, query: Query = {}) => {
    const response = await send(urlOf(options.baseUrl, path, query));
    if (response.status === 401) throw new ApiCallError("token_rejected");
    const envelope = envelopeSchema(z.unknown()).safeParse(await readJson(response));
    if (!envelope.success) throw new ApiCallError("bad_response");
    if (envelope.data.error !== null) throw new ApiCallError(envelope.data.error.code);
    const data = schema.safeParse(envelope.data.data);
    if (!data.success) throw new ApiCallError("bad_response");
    return data.data;
  };
  return {
    get,
    /** Public reads ignore a bearer token, so a revoked one is caught here. */
    verifyToken: async () => {
      await get("/v1/me", z.object({ handle: z.string() }));
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
