import type { ProviderEvent } from "@overpass/simulator";
import type { SessionInput } from "./validation.js";

/** What each scenario does to a session once the simulated payer has acted. */
export type WaveOutcome =
  | { payment: "succeeded" }
  | { payment: "failed"; error: { code: string; message: string } }
  | { payment: "expired" };

export type Session = Record<string, unknown> & {
  id: string;
  checkout_status: "open" | "complete" | "expired";
  payment_status: "processing" | "cancelled" | "succeeded";
  transaction_id: string;
  client_reference: string | null;
};

const sessionLifetimeMs = 30 * 60_000;
export const businessName = "Overpass Sandbox";

/** YYYY-MM-DDThh:mm:ssZ, the timestamp format of the reference. */
export const waveTime = (date: Date) => `${date.toISOString().slice(0, 19)}Z`;

type Build = {
  input: SessionInput;
  id: string;
  transactionId: string;
  now: Date;
  webOrigin: string;
};

/** Field order follows the documented Checkout Session object. */
export function openSession({ input, id, transactionId, now, webOrigin }: Build): Session {
  const mobile = input.restrict_payer_mobile;
  return {
    id,
    amount: input.amount,
    checkout_status: "open",
    client_reference: input.client_reference ?? null,
    currency: input.currency,
    error_url: input.error_url,
    last_payment_error: null,
    business_name: businessName,
    payment_status: "processing",
    transaction_id: transactionId,
    ...(input.aggregated_merchant_id === undefined
      ? {}
      : { aggregated_merchant_id: input.aggregated_merchant_id }),
    ...(mobile === undefined
      ? {}
      : { restrict_payer_mobile: mobile, enforce_payer_mobile: mobile }),
    success_url: input.success_url,
    wave_launch_url: `${webOrigin}/sandbox/launch/wave/${id}`,
    when_completed: null,
    when_created: waveTime(now),
    when_expires: waveTime(new Date(now.getTime() + sessionLifetimeMs)),
  };
}

/** The stored session after the payer acted, and the webhook Wave would send, if any. */
export function settle(session: Session, outcome: WaveOutcome, now: Date, eventId: string) {
  if (outcome.payment === "expired") {
    return {
      session: { ...session, checkout_status: "expired", when_completed: waveTime(now) } as Session,
      events: [],
    };
  }
  if (outcome.payment === "failed") {
    const failed = { ...session, last_payment_error: outcome.error };
    const payload = {
      id: session.id,
      payment_status: "failed",
      checkout_status: "failed",
      last_payment_error: outcome.error,
    };
    return {
      session: failed,
      events: [{ id: eventId, type: "checkout.session.payment_failed", payload }],
    };
  }
  const paid: Session = {
    ...session,
    checkout_status: "complete",
    payment_status: "succeeded",
    when_completed: waveTime(now),
  };
  const events: ProviderEvent[] = [
    { id: eventId, type: "checkout.session.completed", payload: paid },
  ];
  return { session: paid, events };
}
