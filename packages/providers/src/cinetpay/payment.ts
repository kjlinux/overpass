import type { ProviderEvent } from "@overpass/simulator";
import type { PaymentInput, statuses } from "./schemas.js";

export type PaymentStatus = (typeof statuses)[number];

/** Timeout leaves the payment PENDING with no notification, as an unpaid one stays. */
export type CinetpayOutcome = { status: Exclude<PaymentStatus, "FAILED"> };

export type PaymentRecord = {
  input: PaymentInput;
  transactionId: string;
  notifyToken: string;
  status: PaymentStatus;
};

export type Notification = {
  notify_token: string;
  merchant_transaction_id: string;
  transaction_id: string;
  status: PaymentStatus;
};

/** The payment once the simulated payer acted, and the notification CinetPay would post, if any. */
export function settle(record: PaymentRecord, outcome: CinetpayOutcome) {
  const settled: PaymentRecord = { ...record, status: outcome.status };
  if (outcome.status === "PENDING") return { record: settled, events: [] };
  const payload: Notification = {
    notify_token: settled.notifyToken,
    merchant_transaction_id: settled.input.merchant_transaction_id,
    transaction_id: settled.transactionId,
    status: settled.status,
  };
  const event: ProviderEvent = { id: settled.transactionId, type: settled.status, payload };
  return { record: settled, events: [event] };
}

/** Amounts go out as strings, as the README says responses carry them. */
export function view(record: PaymentRecord): Record<string, unknown> {
  return {
    merchant_transaction_id: record.input.merchant_transaction_id,
    transaction_id: record.transactionId,
    amount: String(record.input.amount),
    currency: record.input.currency,
    status: record.status,
    payment_method: record.input.payment_method ?? null,
    designation: record.input.designation ?? null,
  };
}
