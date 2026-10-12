import type {
  AccountDeleteInput,
  Contributions,
  PasswordChangeInput,
  ProfileUpdateInput,
  PublicProfile,
} from "@overpass/shared";
import { AppError } from "../../../http/app-error.js";
import { UniqueViolation } from "../model.js";
import type { UserPatch, UserRecord } from "../model.js";
import { hashPassword, verifyPassword } from "../passwords.js";
import type { ServiceContext } from "./context.js";

/** Points rule of the specification: published route 10, check 2, confirmed pothole 5. */
export function pointsFor(contributions: Contributions): number {
  return contributions.routes * 10 + contributions.checks * 2 + contributions.potholes * 5;
}

async function requirePassword(user: UserRecord, password: string): Promise<void> {
  if (!(await verifyPassword(user.passwordHash, password))) {
    throw new AppError("wrong_password", 403);
  }
}

function consentPatch(ctx: ServiceContext, user: UserRecord, newsletter?: boolean): UserPatch {
  if (newsletter === undefined) return {};
  return { newsletterConsentAt: newsletter ? (user.newsletterConsentAt ?? ctx.now()) : null };
}

export function profileService(ctx: ServiceContext) {
  const findUser = async (id: string) => {
    const user = await ctx.repository.findUserById(id);
    if (user === null) throw new AppError("unauthorized", 401);
    return user;
  };

  return {
    updateProfile: async (userId: string, input: ProfileUpdateInput) => {
      const { newsletter, ...fields } = input;
      const user = await findUser(userId);
      try {
        return await ctx.repository.updateUser(userId, {
          ...fields,
          ...consentPatch(ctx, user, newsletter),
        });
      } catch (error) {
        if (error instanceof UniqueViolation) throw new AppError("handle_taken", 409);
        throw error;
      }
    },

    publicProfile: async (handle: string): Promise<PublicProfile> => {
      const user = await ctx.repository.findUserByHandle(handle);
      if (user === null) throw new AppError("not_found", 404);
      const contributions = await ctx.contributions(user.id);
      return {
        handle: user.handle,
        country: user.country,
        stacks: user.stacks,
        contributions,
        points: pointsFor(contributions),
        memberSince: user.createdAt.toISOString(),
      };
    },

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
