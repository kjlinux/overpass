import { isConfirmed } from "@overpass/shared";
import type { ProfileUpdateInput, PublicProfile } from "@overpass/shared";
import { AppError } from "../../../http/app-error.js";
import { UniqueViolation } from "../model.js";
import type { UserPatch, UserRecord } from "../model.js";
import type { ServiceContext } from "./context.js";

function consentPatch(ctx: ServiceContext, user: UserRecord, newsletter?: boolean): UserPatch {
  if (newsletter === undefined) return {};
  return { newsletterConsentAt: newsletter ? (user.newsletterConsentAt ?? ctx.now()) : null };
}

export function profileService(ctx: ServiceContext) {
  return {
    updateProfile: async (userId: string, input: ProfileUpdateInput) => {
      const { newsletter, ...fields } = input;
      const user = await ctx.repository.findUserById(userId);
      if (user === null) throw new AppError("unauthorized", 401);
      try {
        const updated = await ctx.repository.updateUser(userId, {
          ...fields,
          ...consentPatch(ctx, user, newsletter),
        });
        if (newsletter === true && user.newsletterConsentAt === null) {
          await ctx.newsletterConsent({ email: updated.email, language: updated.language });
        }
        return updated;
      } catch (error) {
        if (error instanceof UniqueViolation) throw new AppError("handle_taken", 409);
        throw error;
      }
    },

    publicProfile: async (handle: string): Promise<PublicProfile> => {
      const user = await ctx.repository.findUserByHandle(handle);
      if (user === null) throw new AppError("not_found", 404);
      const contributions = await ctx.contributions(user.id);
      const points = await ctx.points(user.id);
      return {
        handle: user.handle,
        country: user.country,
        stacks: user.stacks,
        contributions,
        points,
        confirmed: isConfirmed(points),
        memberSince: user.createdAt.toISOString(),
      };
    },
  };
}
