import type { Me } from "@overpass/shared";
import { z } from "zod";
import type { UserRecord } from "./model.js";

export {
  accountDeleteInput,
  confirmInput,
  forgotInput,
  loginInput,
  passwordChangeInput,
  profileUpdateInput,
  registerInput,
  resetInput,
  tokenCreateInput,
} from "@overpass/shared";

export const tokenIdParams = z.object({ id: z.uuid({ error: "id_invalid" }) });

export const handleParams = z.object({ handle: z.string().max(64) });

/** The private view of an account: never the hash, the session version or the role history. */
export function toMe(user: UserRecord): Me {
  return {
    id: user.id,
    email: user.email,
    handle: user.handle,
    country: user.country,
    language: user.language,
    role: user.role,
    stacks: user.stacks,
    newsletter: user.newsletterConsentAt !== null,
    createdAt: user.createdAt.toISOString(),
  };
}
