import { createHash } from "node:crypto";
import type { EndpointInput, SimRequest, SimResponse } from "@overpass/simulator";
import { cinetpayErrors } from "./errors.js";
import { loginInput } from "./schemas.js";

export const tokenLifetimeSeconds = 3600;
const kind = "token";
const bearer = /^bearer (\S+)$/i;

// The token embeds the test key, so only its digest may reach the object store.
const digest = (token: string) => createHash("sha256").update(token).digest("hex");

const bearerOf = (request: SimRequest) => bearer.exec(request.headers.authorization ?? "")?.[1];

/** The test key travels inside the token, so calls after login still name their sandbox key. */
export function credentialOf(request: SimRequest): string | undefined {
  const body = request.body as { api_key?: unknown } | undefined;
  if (typeof body?.api_key === "string") return body.api_key;
  return bearerOf(request)?.split(".")[0];
}

export async function login({ request, store, now, newId }: EndpointInput<unknown>) {
  const parsed = loginInput.safeParse(request.body);
  if (!parsed.success) {
    return { response: cinetpayErrors.invalid(String(parsed.error.issues[0]?.path[0] ?? "body")) };
  }
  const token = `${parsed.data.api_key}.${newId()}`;
  const expiresAt = now.getTime() + tokenLifetimeSeconds * 1000;
  await store.put(kind, digest(token), { expiresAt });
  const body = { access_token: token, token_type: "Bearer", expires_in: tokenLifetimeSeconds };
  return { response: { status: 200, body } };
}

/** Undefined when the bearer token is live, else the refusal the README names. */
export async function refuseToken({
  request,
  store,
  now,
}: EndpointInput<unknown>): Promise<SimResponse | undefined> {
  const token = bearerOf(request);
  const stored =
    token === undefined
      ? undefined
      : ((await store.get(kind, digest(token))) as { expiresAt: number } | undefined);
  if (stored === undefined) return cinetpayErrors.invalidToken();
  return stored.expiresAt > now.getTime() ? undefined : cinetpayErrors.expiredToken();
}
