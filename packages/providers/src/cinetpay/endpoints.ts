import { randomBytes } from "node:crypto";
import type { Endpoint, EndpointInput } from "@overpass/simulator";
import { login, refuseToken } from "./auth.js";
import { cinetpayErrors } from "./errors.js";
import { settle, view } from "./payment.js";
import type { CinetpayOutcome, PaymentRecord } from "./payment.js";
import {
  loginInput,
  loginResponse,
  paymentCreated,
  paymentInput,
  paymentView,
  refusal,
} from "./schemas.js";

type Input = EndpointInput<CinetpayOutcome>;
const kind = "payment";
const byTransaction = "payment_ref";

async function create(input: Input) {
  const { request, outcome, store, newId, webOrigin } = input;
  const denied = await refuseToken(input);
  if (denied !== undefined) return { response: denied };
  const parsed = paymentInput.safeParse(request.body);
  if (!parsed.success) {
    return { response: cinetpayErrors.invalid(String(parsed.error.issues[0]?.path[0] ?? "body")) };
  }
  const merchantId = parsed.data.merchant_transaction_id;
  const taken = await Promise.all([
    store.get(kind, merchantId),
    store.get(byTransaction, merchantId),
  ]);
  if (taken.some((found) => found !== undefined)) {
    return { response: cinetpayErrors.duplicate(merchantId) };
  }
  const opened: PaymentRecord = {
    input: parsed.data,
    transactionId: newId(),
    notifyToken: randomBytes(16).toString("hex"),
    status: "PENDING",
  };
  const settled = settle(opened, outcome);
  await store.put(kind, merchantId, settled.record);
  await store.put(byTransaction, opened.transactionId, merchantId);
  const body = {
    merchant_transaction_id: merchantId,
    transaction_id: opened.transactionId,
    status: "PENDING",
    payment_url: `${webOrigin}/sandbox/launch/cinetpay/${opened.transactionId}`,
    notify_token: opened.notifyToken,
  };
  return { response: { status: 200, body }, events: settled.events };
}

async function find(input: Input) {
  const denied = await refuseToken(input);
  if (denied !== undefined) return { response: denied };
  const id = input.params.id ?? "";
  const alias = (await input.store.get(byTransaction, id)) as string | undefined;
  const record = ((await input.store.get(kind, id)) ??
    (alias === undefined ? undefined : await input.store.get(kind, alias))) as
    PaymentRecord | undefined;
  if (record === undefined) return { response: cinetpayErrors.notFound() };
  return { response: { status: 200, body: view(record) } };
}

const refusals = { 401: refusal, 422: refusal };

/** Paths are simulator choices except GET /v1/payment/{id}, which the README names. */
export const cinetpayEndpoints: Endpoint<CinetpayOutcome>[] = [
  {
    method: "POST",
    path: "/v1/oauth/login",
    handle: login,
    docs: { body: loginInput, responses: { 200: loginResponse, 422: refusal } },
  },
  {
    method: "POST",
    path: "/v1/payment",
    handle: create,
    docs: { body: paymentInput, responses: { 200: paymentCreated, ...refusals } },
  },
  {
    method: "GET",
    path: "/v1/payment/:id",
    handle: find,
    docs: { responses: { 200: paymentView, 401: refusal, 404: refusal } },
  },
];
