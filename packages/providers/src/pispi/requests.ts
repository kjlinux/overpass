import type { EndpointInput, ObjectStore } from "@overpass/simulator";
import protocol from "./protocol.json" with { type: "json" };
import { json, parseBody, problems } from "./problem.js";
import { confirmationBody, demandeRequest } from "./schemas.js";
import { end2endIdOf, paymentKind, paymentOf, requestKind, settle } from "./settle.js";
import type { Demande, PispiOutcome } from "./settle.js";

type Input = EndpointInput<PispiOutcome>;

const demands = async (store: ObjectStore) => (await store.list(requestKind)) as Demande[];

/** Saves the request, and the received payment it became once the payer answered. */
async function keep(store: ObjectStore, demand: Demande): Promise<void> {
  await store.put(requestKind, demand.txId, demand);
  if (
    demand.end2endId !== undefined &&
    (demand.statut === "IRREVOCABLE" || demand.statut === "REJETE")
  ) {
    await store.put(paymentKind, demand.end2endId, paymentOf(demand));
  }
}

function sendNow(demand: Demande, outcome: PispiOutcome, input: Input) {
  const sent: Demande = { ...demand, statut: "ENVOYE", dateEnvoi: input.now.toISOString() };
  return { sent, settled: settle(sent, outcome, input.now, `ev_${input.newId()}`) };
}

export async function createRequest(input: Input) {
  const parsed = parseBody(demandeRequest, input.request.body);
  if ("refusal" in parsed) return { response: parsed.refusal };
  const body = { ...parsed.value, categorie: String(parsed.value.categorie) };
  const at = input.now.toISOString();
  if ((await input.store.get(requestKind, body.txId)) !== undefined) {
    return {
      response: json(200, { ...body, statut: "REJETE", statutRaison: "DU03", dateDemande: at }),
    };
  }
  const base: Demande = {
    ...body,
    statut: "INITIE",
    payeurNom: protocol.simulatorPayerName,
    payeurPays: "CI",
    end2endId: end2endIdOf(input.now, input.newId),
    dateDemande: at,
  };
  if (body.confirmation) {
    await keep(input.store, base);
    return { response: json(200, base) };
  }
  const { sent, settled } = sendNow(base, input.outcome, input);
  await keep(input.store, settled.demand);
  return { response: json(200, sent), events: settled.events };
}

export async function confirmRequest(input: Input) {
  const demand = (await input.store.get(requestKind, input.params.txId ?? "")) as
    Demande | undefined;
  if (demand === undefined) return { response: problems.notFound() };
  const parsed = parseBody(confirmationBody, input.request.body);
  if ("refusal" in parsed) return { response: parsed.refusal };
  if (demand.statut === "ANNULE")
    return { response: problems.forbidden(protocol.alreadyCancelled) };
  if (demand.statut !== "INITIE")
    return { response: problems.forbidden(protocol.alreadyConfirmed) };
  const at = input.now.toISOString();
  if (!parsed.value.decision) {
    const cancelled: Demande = { ...demand, statut: "ANNULE", dateConfirmation: at };
    await keep(input.store, cancelled);
    return { response: json(200, cancelled) };
  }
  const { sent, settled } = sendNow({ ...demand, dateConfirmation: at }, input.outcome, input);
  await keep(input.store, settled.demand);
  return { response: json(200, sent), events: settled.events };
}

export async function listRequests({ store }: Input) {
  const data = await demands(store);
  return { response: json(200, { data, meta: { total: data.length } }) };
}

export async function readRequest({ store, params }: Input) {
  const demand = await store.get(requestKind, params.txId ?? "");
  return { response: demand === undefined ? problems.notFound() : json(200, demand) };
}
