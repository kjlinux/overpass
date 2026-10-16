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

async function tellAuthor(deps: RequestsDeps, record: ProposalRecord): Promise<void> {
  const contact = record.userId === null ? null : await deps.contacts(record.userId);
  if (contact === null) return;
  const link = `${deps.webOrigin}/${contact.language}/dashboard`;
  const outcome = {
    name: record.name,
    accepted: record.status === "accepted",
    reason: record.reason,
    link,
  };
  deps.notify(outcomeMail(contact.email, contact.language, outcome));
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
  if (proposal.status !== "pending") throw new AppError("proposal_decided", 409);
  const accepted = input.decision === "accept";
  const service = accepted ? await deps.catalogue.create(proposal) : null;
  const decided = await deps.repository.decideProposal(id, {
    status: accepted ? "accepted" : "rejected",
    reason: input.reason ?? null,
    serviceId: service?.id ?? null,
    decidedBy: account.id,
    decidedAt: deps.now(),
  });
  if (decided === null) throw new AppError("proposal_decided", 409);
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
