import { randomBytes } from "node:crypto";
import type { Language, LoginInput, RegisterInput } from "@overpass/shared";
import { AppError } from "../../../http/app-error.js";
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
  const authenticateSession = async (token: string) => {
    const claims = await ctx.tokens.verifySession(token);
    if (claims === null) return null;
    const user = await ctx.repository.findUserById(claims.userId);
    return user?.sessionVersion === claims.version ? user : null;
  };
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

    authenticateSession,

    /** Stateless sessions can only be ended by moving the version, so every copy stops working. */
    logout: async (token: string) => {
      const user = await authenticateSession(token);
      if (user !== null) await ctx.repository.rotateCredentials(user.id, {});
    },
  };
}
