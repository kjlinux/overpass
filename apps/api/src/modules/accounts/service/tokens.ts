import type { CreatedToken, TokenCreateInput, TokenSummary } from "@overpass/shared";
import { AppError } from "../../../http/app-error.js";
import { generateApiToken, hashApiToken, looksLikeApiToken } from "../api-tokens.js";
import type { TokenRecord } from "../model.js";
import type { ServiceContext } from "./context.js";

export function toTokenSummary(token: TokenRecord): TokenSummary {
  return {
    id: token.id,
    name: token.name,
    usage: token.usage,
    createdAt: token.createdAt.toISOString(),
    lastUsedAt: token.lastUsedAt?.toISOString() ?? null,
  };
}

export function tokenService(ctx: ServiceContext) {
  return {
    /** The clear token exists only in this return value; only its hash is stored. */
    createToken: async (userId: string, input: TokenCreateInput): Promise<CreatedToken> => {
      const token = generateApiToken();
      const record = await ctx.repository.createToken({
        ...input,
        userId,
        tokenHash: hashApiToken(token),
      });
      return { ...toTokenSummary(record), token };
    },

    listTokens: async (userId: string) =>
      (await ctx.repository.listActiveTokens(userId)).map(toTokenSummary),

    revokeToken: async (userId: string, tokenId: string) => {
      if (!(await ctx.repository.revokeToken(userId, tokenId, ctx.now()))) {
        throw new AppError("token_not_found", 404);
      }
    },

    authenticateToken: async (token: string) => {
      if (!looksLikeApiToken(token)) return null;
      return ctx.repository.findUserByActiveTokenHash(hashApiToken(token), ctx.now());
    },
  };
}
