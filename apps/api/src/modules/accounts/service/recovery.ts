import type { ForgotInput, ResetInput } from "@overpass/shared";
import { AppError } from "../../../http/app-error.js";
import { resetMail } from "../mail.js";
import { hashPassword } from "../passwords.js";
import type { ServiceContext } from "./context.js";

/** Forgotten password: a signed, single-use link, then new credentials and no old tokens. */
export function recoveryService(ctx: ServiceContext) {
  return {
    /** Resolves before the mail leaves, so timing does not reveal whether the account exists. */
    requestReset: async (input: ForgotInput) => {
      const user = await ctx.repository.findUserByEmail(input.email);
      if (user === null) return;
      const token = await ctx.tokens.signReset(user);
      const link = `${ctx.webOrigin}/${user.language}/reset-password#token=${token}`;
      ctx.mailer.send(resetMail(user.email, user.language, link)).catch(ctx.onBackgroundError);
    },

    resetPassword: async (input: ResetInput) => {
      const claims = await ctx.tokens.verifyReset(input.token);
      const user = claims === null ? null : await ctx.repository.findUserById(claims.userId);
      if (user === null || claims?.fingerprint !== ctx.tokens.fingerprint(user.passwordHash)) {
        throw new AppError("reset_invalid", 400);
      }
      const passwordHash = await hashPassword(input.password);
      await ctx.repository.rotateCredentials(user.id, { passwordHash });
      await ctx.repository.revokeAllTokens(user.id, ctx.now());
    },
  };
}
