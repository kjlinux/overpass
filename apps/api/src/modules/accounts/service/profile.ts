import type { Contributions, ProfileUpdateInput, PublicProfile } from "@overpass/shared";
import { AppError } from "../../../http/app-error.js";
import { UniqueViolation } from "../model.js";
import type { UserPatch, UserRecord } from "../model.js";
import type { ServiceContext } from "./context.js";

/** Points rule of the specification: published route 10, check 2, confirmed pothole 5. */
export function pointsFor(contributions: Contributions): number {
  return contributions.routes * 10 + contributions.checks * 2 + contributions.potholes * 5;
}

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
  };
}
