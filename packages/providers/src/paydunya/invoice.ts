import type { ProviderEvent } from "@overpass/simulator";
import protocol from "./protocol.json" with { type: "json" };
import { invoiceInput } from "./schemas.js";
import type { InvoiceInput } from "./schemas.js";

/** The documented statuses; timeout leaves the invoice pending, as an unpaid one stays. */
export type PaydunyaOutcome = { status: "completed" | "failed" | "pending" };

export type InvoiceRecord = {
  invoice: Record<string, unknown>;
  custom_data: Record<string, unknown>;
  actions: Record<string, unknown>;
  mode: "test";
  status: "pending" | "completed" | "failed";
  fail_reason: string;
  customer: Record<string, unknown>;
  receipt_url: string;
};

// The documentation names the required fields as root node plus child.
const requiredChild: Record<string, string> = { invoice: "total_amount", store: "name" };

/** The first missing or invalid field, in the dotted form of the documentation. */
export function checkInvoice(body: unknown): InvoiceInput | string {
  const parsed = invoiceInput.safeParse(body);
  if (parsed.success) return parsed.data;
  const found = (parsed.error.issues[0]?.path ?? []).map(String);
  const path = found.length === 0 ? ["invoice"] : found;
  const child = path.length === 1 ? requiredChild[path[0] ?? ""] : undefined;
  return [...path, ...(child === undefined ? [] : [child])].join(".");
}

type Open = { input: InvoiceInput; token: string; webOrigin: string };

/** Field order follows the documented confirm response. */
export function openInvoice({ input, token, webOrigin }: Open): InvoiceRecord {
  return {
    invoice: {
      items: input.invoice.items ?? {},
      taxes: input.invoice.taxes ?? {},
      token,
      total_amount: input.invoice.total_amount,
      description: input.invoice.description ?? "",
    },
    custom_data: input.custom_data ?? {},
    actions: { cancel_url: "", return_url: "", callback_url: "", ...input.actions },
    mode: "test",
    status: "pending",
    fail_reason: "",
    customer: { ...protocol.payer, ...input.invoice.customer },
    receipt_url: `${webOrigin}/sandbox/launch/paydunya/${token}`,
  };
}

/** The invoice once the simulated payer acted, and the IPN PayDunya would post, if any. */
export function settle(record: InvoiceRecord, outcome: PaydunyaOutcome) {
  const settled: InvoiceRecord = { ...record, status: outcome.status };
  const token = String(record.invoice.token);
  const events: ProviderEvent[] =
    outcome.status === "pending" ? [] : [{ id: token, type: outcome.status, payload: settled }];
  return { record: settled, events };
}

/** The confirm structure, shared by GET confirm and the IPN. */
export function confirmBody(record: InvoiceRecord, hash: string): Record<string, unknown> {
  const { invoice, ...rest } = record;
  return {
    response_code: "00",
    response_text: protocol.transactionFound,
    hash,
    invoice,
    ...rest,
  };
}
