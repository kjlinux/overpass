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
      const passwordHash = await hashPassword(input.newPassword);
      const updated = await ctx.repository.rotateCredentials(user.id, { passwordHash });
      return { user: updated, session: await ctx.tokens.signSession(updated) };
    },

    deleteAccount: async (user: UserRecord, input: AccountDeleteInput) => {
      await requirePassword(user, input.password);
      const affected = await ctx.deletion.affected(user.id);
      await ctx.repository.deleteUser(user.id);
      await ctx.deletion.done(affected);
    },
  };
}
