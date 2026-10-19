import type { SimulatorRequest, SimulatorVote } from "@overpass/shared";
import { AppError } from "../../../http/app-error.js";
import type { Account } from "../../accounts/index.js";
import type { RequestsDeps } from "./context.js";

const rankingSize = 50;

async function serviceOf(deps: RequestsDeps, slug: string) {
  const service = await deps.catalogue.bySlug(slug);
  if (service === null) throw new AppError("not_found", 404);
  return service;
}

async function tally(deps: RequestsDeps, slug: string, reader: Account | null) {
  const service = await serviceOf(deps, slug);
  const { votes, voted } = await deps.repository.votes(service.id, reader?.id ?? null);
  return {
    service: service.slug,
    simulated: service.simulated,
    votes,
    voted,
  } satisfies SimulatorVote;
}

export function voteService(deps: RequestsDeps) {
  return {
    tally: (slug: string, reader: Account | null) => tally(deps, slug, reader),

    /** One vote per account: voting twice keeps a single vote. */
    vote: async (account: Account, slug: string) => {
      const service = await serviceOf(deps, slug);
      if (service.simulated) throw new AppError("already_simulated", 409);
      await deps.repository.addVote(service.id, account.id, deps.now());
      return tally(deps, slug, account);
    },

    withdraw: async (account: Account, slug: string) => {
      const service = await serviceOf(deps, slug);
      await deps.repository.removeVote(service.id, account.id);
      return tally(deps, slug, account);
    },

    /** Services that got a simulator in the meantime leave the ranking. */
    ranking: async (): Promise<SimulatorRequest[]> => {
      const rows = await deps.repository.mostVoted(rankingSize);
      const entries = await deps.catalogue.byIds(rows.map((row) => row.serviceId));
      const open = rows.flatMap((row) => {
        const entry = entries.get(row.serviceId);
        return entry === undefined || entry.simulated ? [] : [{ entry, votes: row.votes }];
      });
      return open.map(({ entry, votes }) => ({
        rank: open.findIndex((other) => other.votes === votes) + 1,
        service: { slug: entry.slug, name: entry.name, category: entry.category },
        votes,
      }));
    },
  };
}
