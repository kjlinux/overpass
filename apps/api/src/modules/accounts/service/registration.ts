import { randomBytes } from "node:crypto";
import type { Language, RegisterInput } from "@overpass/shared";
import { AppError } from "../../../http/app-error.js";
import { confirmMail, existsMail } from "../mail.js";
import { UniqueViolation } from "../model.js";
import { hashPassword } from "../passwords.js";
import type { PendingSignUp } from "../signup-tokens.js";
import { openSession } from "./auth.js";
import type { ServiceContext } from "./context.js";

const handleAttempts = 5;

function generatedHandle(): string {
  return `dev-${randomBytes(3).toString("hex")}`;
}

async function createMember(ctx: ServiceContext, pending: PendingSignUp) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await ctx.repository.createUser({ ...pending, handle: generatedHandle() });
    } catch (error) {
      if (!(error instanceof UniqueViolation)) throw error;
      if (error.field === "email") throw new AppError("email_taken", 409);
      if (attempt === handleAttempts) throw error;
    }
  }
}

/** Sign-up by e-mail confirmation: the answer never tells whether the address has an account. */
export function registrationService(ctx: ServiceContext) {
  const page = (language: Language, path: string) => `${ctx.webOrigin}/${language}${path}`;
  const send = (message: Parameters<ServiceContext["mailer"]["send"]>[0]) => {
    ctx.mailer.send(message).catch(ctx.onBackgroundError);
  };

  return {
    /** Hashes in both cases and sends the mail in the background, so timing tells nothing. */
    register: async (input: RegisterInput, language: Language): Promise<void> => {
      const passwordHash = await hashPassword(input.password);
      const existing = await ctx.repository.findUserByEmail(input.email);
      if (existing !== null) {
        const links = {
          signIn: page(existing.language, "/sign-in"),
          forgot: page(existing.language, "/forgot-password"),
        };
        send(existsMail(existing.email, existing.language, links));
        return;
      }
      const token = await ctx.signups.seal({
        email: input.email,
        passwordHash,
        country: input.country,
        language,
      });
      send(
        confirmMail(input.email, language, `${page(language, "/sign-up/confirm")}#token=${token}`),
      );
    },

    confirmSignUp: async (token: string) => {
      const pending = await ctx.signups.open(token);
      if (pending === null) throw new AppError("signup_invalid", 400);
      return openSession(ctx, await createMember(ctx, pending));
    },
  };
}
