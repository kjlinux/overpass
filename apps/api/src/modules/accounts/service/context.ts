import { pointsFor } from "@overpass/shared";
import type { Contributions } from "@overpass/shared";
import type { Mailer } from "../../../mail/mailer.js";
import type { AccountsRepository } from "../model.js";
import { signedTokens } from "../signed-tokens.js";
import type { SignedTokens } from "../signed-tokens.js";
import { signupTokens } from "../signup-tokens.js";

/** Counts a user's contributions; the routes and checks modules will provide it. */
export type ContributionsSource = (userId: string) => Promise<Contributions>;

/** The computed points of a user; the ranking module provides its cache. */
export type PointsSource = (userId: string) => Promise<number>;

/** Accounts whose points depend on a member, recomputed once that member is deleted. */
export type DeletionEffects = {
  affected: (userId: string) => Promise<string[]>;
  done: (userIds: string[]) => Promise<void>;
};

export type AccountsDeps = {
  repository: AccountsRepository;
  mailer: Mailer;
  secret: string;
  webOrigin: string;
  contributions?: ContributionsSource;
  points?: PointsSource;
  deletion?: DeletionEffects;
  onBackgroundError?: (error: unknown) => void;
  now?: () => Date;
};

export type ServiceContext = Required<Omit<AccountsDeps, "secret">> & {
  tokens: SignedTokens;
  signups: ReturnType<typeof signupTokens>;
};

const noEffects: DeletionEffects = {
  affected: () => Promise.resolve([]),
  done: () => Promise.resolve(),
};

const noContributions: ContributionsSource = () =>
  Promise.resolve({ routes: 0, checks: 0, potholes: 0 });

/** Without the ranking cache, points follow the shared rule over the counted contributions. */
function pointsFromContributions(contributions: ContributionsSource): PointsSource {
  return async (userId) => {
    const counted = await contributions(userId);
    return pointsFor({ ...counted, accepted: 0, useful: 0, articles: 0, stars: 0 });
  };
}

export function createContext(deps: AccountsDeps): ServiceContext {
  const contributions = deps.contributions ?? noContributions;
  return {
    repository: deps.repository,
    mailer: deps.mailer,
    webOrigin: deps.webOrigin,
    contributions,
    points: deps.points ?? pointsFromContributions(contributions),
    deletion: deps.deletion ?? noEffects,
    onBackgroundError: deps.onBackgroundError ?? (() => undefined),
    now: deps.now ?? (() => new Date()),
    tokens: signedTokens(deps.secret),
    signups: signupTokens(deps.secret),
  };
}
