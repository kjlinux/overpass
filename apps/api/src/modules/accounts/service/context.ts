import type { Contributions } from "@overpass/shared";
import type { Mailer } from "../../../mail/mailer.js";
import type { AccountsRepository } from "../model.js";
import { signedTokens } from "../signed-tokens.js";
import type { SignedTokens } from "../signed-tokens.js";

/** Counts a user's contributions; the routes and checks modules will provide it. */
export type ContributionsSource = (userId: string) => Promise<Contributions>;

export type AccountsDeps = {
  repository: AccountsRepository;
  mailer: Mailer;
  secret: string;
  webOrigin: string;
  contributions?: ContributionsSource;
  onBackgroundError?: (error: unknown) => void;
  now?: () => Date;
};

export type ServiceContext = Required<Omit<AccountsDeps, "secret">> & { tokens: SignedTokens };

const noContributions: ContributionsSource = () =>
  Promise.resolve({ routes: 0, checks: 0, potholes: 0 });

export function createContext(deps: AccountsDeps): ServiceContext {
  return {
    repository: deps.repository,
    mailer: deps.mailer,
    webOrigin: deps.webOrigin,
    contributions: deps.contributions ?? noContributions,
    onBackgroundError: deps.onBackgroundError ?? (() => undefined),
    now: deps.now ?? (() => new Date()),
    tokens: signedTokens(deps.secret),
  };
}
