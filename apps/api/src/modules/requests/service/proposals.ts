import type { Proposal, ProposalCreateInput, ProposalDecisionInput } from "@overpass/shared";
import { AppError } from "../../../http/app-error.js";
import type { Account } from "../../accounts/index.js";
import { slugOf } from "../../routes/index.js";
import { outcomeMail } from "../mail.js";
import type { ProposalRecord } from "../model.js";
import { toProposals } from "./context.js";
import type { RequestsDeps } from "./context.js";

const listSize = 100;

function requireAdmin(account: Account): void {
  if (account.role !== "admin") throw new AppError("admin_only", 403);
}

async function one(deps: RequestsDeps, record: ProposalRecord): Promise<Proposal> {
  const [proposal] = await toProposals(deps, [record]);
  if (proposal === undefined) throw new Error("proposal mapping returned nothing");
  return proposal;
}

/** The decision is already stored: a lookup failure is logged, never turned into an error. */
async function tellAuthor(deps: RequestsDeps, record: ProposalRecord): Promise<void> {
  try {
    const contact = record.userId === null ? null : await deps.contacts(record.userId);
    if (contact === null) return;
    const link = `${deps.webOrigin}/${contact.language}/dashboard`;
    const accepted = record.status === "accepted";
    const outcome = { name: record.name, accepted, reason: record.reason, link };
    deps.notify(outcomeMail(contact.email, contact.language, outcome));
  } catch (error) {
    deps.reportError(error);
  }
}

/** Creates the service once the proposal is claimed; a failed creation reopens the proposal. */
async function withService(deps: RequestsDeps, claimed: ProposalRecord): Promise<ProposalRecord> {
  try {
    const service = await deps.catalogue.create(claimed);
    return (await deps.repository.attachService(claimed.id, service.id)) ?? claimed;
  } catch (error) {
    await deps.repository.reopenProposal(claimed.id);
    throw error;
  }
}

async function decide(
  deps: RequestsDeps,
  account: Account,
  id: string,
  input: ProposalDecisionInput,
) {
  requireAdmin(account);
  const proposal = await deps.repository.findProposal(id);
  if (proposal === null) throw new AppError("not_found", 404);
  const accepted = input.decision === "accept";
  const claimed = await deps.repository.decideProposal(id, {
    status: accepted ? "accepted" : "rejected",
    reason: input.reason ?? null,
    serviceId: null,
    decidedBy: account.id,
    decidedAt: deps.now(),
  });
  if (claimed === null) throw new AppError("proposal_decided", 409);
  const decided = accepted ? await withService(deps, claimed) : claimed;
  await tellAuthor(deps, decided);
  return one(deps, decided);
}

export function proposalService(deps: RequestsDeps) {
  return {
    propose: async (account: Account, input: ProposalCreateInput) => {
      if ((await deps.catalogue.bySlug(slugOf(input.name))) !== null) {
        throw new AppError("service_exists", 409);
      }
      const record = { ...input, userId: account.id, createdAt: deps.now() };
      return one(deps, await deps.repository.insertProposal(record));
    },
    mine: async (account: Account) =>
      toProposals(deps, await deps.repository.proposalsBy(account.id, listSize)),
    pending: async (account: Account) => {
      requireAdmin(account);
      return toProposals(deps, await deps.repository.pendingProposals(listSize));
    },
    decide: (account: Account, id: string, input: ProposalDecisionInput) =>
      decide(deps, account, id, input),
  };
}
