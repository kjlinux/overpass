import type { Endpoint, EndpointInput, ObjectStore } from "@overpass/simulator";
import { missing, waveErrors } from "./errors.js";
import { openSession, settle } from "./session.js";
import type { Session, WaveOutcome } from "./session.js";
import { validateSession } from "./validation.js";

type Input = EndpointInput<WaveOutcome>;
const kind = "checkout_session";

const sessions = async (store: ObjectStore) => (await store.list(kind)) as Session[];
const found = (session: Session | undefined) =>
  session === undefined ? waveErrors.sessionNotFound() : { status: 200, body: session };

async function create({ request, outcome, store, now, newId, webOrigin }: Input) {
  const checked = validateSession(request.body);
  if ("details" in checked) return { response: waveErrors.invalid(checked.details) };
  const id = `cos-${newId().slice(0, 16)}`;
  const transactionId = `T_${newId().slice(0, 10).toUpperCase()}`;
  const session = openSession({ input: checked.input, id, transactionId, now, webOrigin });
  const settled = settle(session, outcome, now, `EV_${newId().slice(0, 12)}`);
  await store.put(kind, id, settled.session);
  return { response: { status: 200, body: session }, events: settled.events };
}

async function byTransaction({ request, store }: Input) {
  const transactionId = request.query.transaction_id;
  if (transactionId === undefined)
    return { response: waveErrors.invalid([missing("transaction_id")]) };
  const match = (await sessions(store)).find((session) => session.transaction_id === transactionId);
  return { response: found(match) };
}

async function search({ request, store }: Input) {
  const reference = request.query.client_reference;
  if (reference === undefined)
    return { response: waveErrors.invalid([missing("client_reference")]) };
  const result = (await sessions(store)).filter(
    (session) => session.client_reference === reference,
  );
  return { response: { status: 200, body: { result } } };
}

async function read({ params, store }: Input) {
  return { response: found((await store.get(kind, params.id ?? "")) as Session | undefined) };
}

async function refund({ params, store }: Input) {
  const session = (await store.get(kind, params.id ?? "")) as Session | undefined;
  if (session === undefined) return { response: waveErrors.sessionNotFound() };
  if (session.payment_status !== "succeeded") return { response: waveErrors.refundFailed() };
  return { response: { status: 200, body: null } };
}

async function expire({ params, store, now }: Input) {
  const session = (await store.get(kind, params.id ?? "")) as Session | undefined;
  if (session === undefined) return { response: waveErrors.sessionNotFound() };
  if (session.checkout_status !== "open") return { response: waveErrors.conflict() };
  await store.put(kind, session.id, settle(session, { payment: "expired" }, now, "").session);
  return { response: { status: 200, body: null } };
}

/** Paths of https://docs.wave.com/checkout; "search" precedes ":id" so it is not read as an id. */
export const waveEndpoints: Endpoint<WaveOutcome>[] = [
  { method: "POST", path: "/v1/checkout/sessions", handle: create },
  { method: "GET", path: "/v1/checkout/sessions", handle: byTransaction },
  { method: "GET", path: "/v1/checkout/sessions/search", handle: search },
  { method: "GET", path: "/v1/checkout/sessions/:id", handle: read },
  { method: "POST", path: "/v1/checkout/sessions/:id/refund", handle: refund },
  { method: "POST", path: "/v1/checkout/sessions/:id/expire", handle: expire },
];
