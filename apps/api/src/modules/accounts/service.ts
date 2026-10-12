import { authService } from "./service/auth.js";
import { createContext } from "./service/context.js";
import type { AccountsDeps } from "./service/context.js";
import { credentialService } from "./service/credentials.js";
import { profileService } from "./service/profile.js";
import { recoveryService } from "./service/recovery.js";
import { tokenService } from "./service/tokens.js";

export type { AccountsDeps, ContributionsSource } from "./service/context.js";
export { pointsFor } from "./service/profile.js";

/** Business rules of the accounts module, independent of HTTP and SQL. */
export function createAccountsService(deps: AccountsDeps) {
  const ctx = createContext(deps);
  return {
    ...authService(ctx),
    ...recoveryService(ctx),
    ...profileService(ctx),
    ...credentialService(ctx),
    ...tokenService(ctx),
  };
}

export type AccountsService = ReturnType<typeof createAccountsService>;
