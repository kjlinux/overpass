import type { EndpointInput, SimResponse } from "@overpass/simulator";
import { json, parseBody, problems } from "./problem.js";
import { tokenForm } from "./schemas.js";

const lifetimeSeconds = 3600;
const kind = "oauth_token";

/** POST /oauth/token: client_credentials only; the test key in x-api-key already proved who calls. */
export async function issueToken({ request, store, now, newId }: EndpointInput<unknown>) {
  const parsed = parseBody(tokenForm, request.body);
  if ("refusal" in parsed) return { response: parsed.refusal };
  const token = `ovp_tok_${newId()}${newId()}`;
  const expiresAt = now.getTime() + lifetimeSeconds * 1000;
  await store.put(kind, token, { expiresAt });
  const scope = parsed.value.scope ?? "";
  return {
    response: json(200, {
      access_token: token,
      token_type: "Bearer",
      expires_in: lifetimeSeconds,
      scope,
    }),
  };
}

/** Every other endpoint needs a live bearer token; the answer is the documented 401 problem. */
export async function requireBearer({
  request,
  store,
  now,
}: EndpointInput<unknown>): Promise<SimResponse | undefined> {
  const token = /^Bearer (\S+)$/.exec(request.headers.authorization ?? "")?.[1];
  const stored =
    token === undefined
      ? undefined
      : ((await store.get(kind, token)) as { expiresAt: number } | undefined);
  return stored !== undefined && stored.expiresAt > now.getTime()
    ? undefined
    : problems.unauthorized();
}
