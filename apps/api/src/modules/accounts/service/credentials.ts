import type { AccountDeleteInput, PasswordChangeInput } from "@overpass/shared";
import { AppError } from "../../../http/app-error.js";
import type { UserRecord } from "../model.js";
import { hashPassword, verifyPassword } from "../passwords.js";
import type { ServiceContext } from "./context.js";

async function requirePassword(user: UserRecord, password: string): Promise<void> {
  if (!(await verifyPassword(user.passwordHash, password))) {
    throw new AppError("wrong_password", 403);
  }
}

/** Actions that ask for the current password again before acting. */
export function credentialService(ctx: ServiceContext) {
  return {
    changePassword: async (user: UserRecord, input: PasswordChangeInput) => {
      await requirePassword(user, input.currentPassword);
      const updated = await ctx.repository.updateUser(user.id, {
        passwordHash: await hashPassword(input.newPassword),
        sessionVersion: user.sessionVersion + 1,
      });
      return { user: updated, session: await ctx.tokens.signSession(updated) };
    },

    deleteAccount: async (user: UserRecord, input: AccountDeleteInput) => {
      await requirePassword(user, input.password);
      await ctx.repository.deleteUser(user.id);
    },
  };
}
