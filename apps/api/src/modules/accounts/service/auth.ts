import { randomBytes } from "node:crypto";
import type {
  ForgotInput,
  Language,
  LoginInput,
  RegisterInput,
  ResetInput,
} from "@overpass/shared";
import { AppError } from "../../../http/app-error.js";
import { resetMail } from "../mail.js";
import { UniqueViolation } from "../model.js";
import type { UserRecord } from "../model.js";
import { hashPassword, verifyPassword } from "../passwords.js";
import type { ServiceContext } from "./context.js";

const handleAttempts = 5;

export type SessionResult = { user: UserRecord; session: string };

function generatedHandle(): string {
  return `dev-${randomBytes(3).toString("hex")}`;
}

async function createWithHandle(ctx: ServiceContext, input: RegisterInput, language: Language) {
  const passwordHash = await hashPassword(input.password);
  const fields = { email: input.email, country: input.country, language, passwordHash };
  for (let attempt = 1; ; attempt++) {
    try {
      return await ctx.repository.createUser({ ...fields, handle: generatedHandle() });
    } catch (error) {
      if (!(error instanceof UniqueViolation)) throw error;
      if (error.field === "email") throw new AppError("email_taken", 409);
      if (attempt === handleAttempts) throw error;
    }
  }
}

export function authService(ctx: ServiceContext) {
  const open = async (user: UserRecord): Promise<SessionResult> => ({
    user,
    session: await ctx.tokens.signSession(user),
  });

  return {
    register: async (input: RegisterInput, language: Language) =>
      open(await createWithHandle(ctx, input, language)),

    login: async (input: LoginInput) => {
      const user = await ctx.repository.findUserByEmail(input.email);
      const valid = await verifyPassword(user?.passwordHash ?? null, input.password);
      if (user === null || !valid) throw new AppError("invalid_credentials", 401);
      return open(user);
    },

    authenticateSession: async (token: string) => {
      const claims = await ctx.tokens.verifySession(token);
      if (claims === null) return null;
      const user = await ctx.repository.findUserById(claims.userId);
      return user?.sessionVersion === claims.version ? user : null;
    },

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
      await ctx.repository.updateUser(user.id, {
        passwordHash: await hashPassword(input.password),
        sessionVersion: user.sessionVersion + 1,
      });
    },
  };
}
