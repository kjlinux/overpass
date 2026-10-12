import type { Database } from "../../db/client.js";
import type { AccountsRepository } from "./model.js";
import { tokenQueries } from "./repository/tokens.js";
import { userQueries } from "./repository/users.js";

/** PostgreSQL implementation of the accounts storage port, through Drizzle. */
export function createAccountsRepository(db: Database): AccountsRepository {
  const usersPart = userQueries(db);
  const { touchActiveToken, ...tokensPart } = tokenQueries(db);
  return {
    ...usersPart,
    ...tokensPart,
    findUserByActiveTokenHash: async (tokenHash, usedAt) => {
      const userId = await touchActiveToken(tokenHash, usedAt);
      return userId === null ? null : usersPart.findUserById(userId);
    },
  };
}
