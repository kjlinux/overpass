import type { Endpoint, EndpointInput } from "@overpass/simulator";
import { paydunyaErrors } from "./errors.js";
import { checkInvoice, confirmBody, openInvoice, settle } from "./invoice.js";
import type { InvoiceRecord, PaydunyaOutcome } from "./invoice.js";
import protocol from "./protocol.json" with { type: "json" };
import { confirmResponse, invoiceCreated, invoiceInput, refusal } from "./schemas.js";
import { masterKeyHash } from "./wire.js";

type Input = EndpointInput<PaydunyaOutcome>;
const kind = "checkout_invoice";

const tokenOf = (id: string) => `test_${id.replace(/[^A-Za-z0-9]/g, "").slice(-10)}`;

async function create({ request, outcome, store, newId, webOrigin }: Input) {
  const checked = checkInvoice(request.body);
  if (typeof checked === "string") return { response: paydunyaErrors.invalid(checked) };
  const token = tokenOf(newId());
  const settled = settle(openInvoice({ input: checked, token, webOrigin }), outcome);
  await store.put(kind, token, settled.record);
  const body = {
    response_code: "00",
    response_text: `${webOrigin}/sandbox/launch/paydunya/${token}`,
    description: protocol.invoiceCreated,
    token,
  };
  return { response: { status: 200, body }, events: settled.events };
}

async function confirm({ request, params, store }: Input) {
  const record = (await store.get(kind, params.token ?? "")) as InvoiceRecord | undefined;
  if (record === undefined) return { response: paydunyaErrors.notFound() };
  const hash = masterKeyHash(request.headers["paydunya-master-key"] ?? "");
  return { response: { status: 200, body: confirmBody(record, hash) } };
}

/** Paths of the sandbox server https://app.paydunya.com/sandbox-api/v1/. */
export const paydunyaEndpoints: Endpoint<PaydunyaOutcome>[] = [
  {
    method: "POST",
    path: "/sandbox-api/v1/checkout-invoice/create",
    handle: create,
    docs: { body: invoiceInput, responses: { 200: invoiceCreated, 400: refusal } },
  },
  {
    method: "GET",
    path: "/sandbox-api/v1/checkout-invoice/confirm/:token",
    handle: confirm,
    docs: { responses: { 200: confirmResponse, 404: refusal } },
  },
];
