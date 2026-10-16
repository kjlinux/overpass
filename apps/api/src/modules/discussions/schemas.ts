import { z } from "zod";

export {
  acceptInput,
  moderationDecisionInput,
  moderationParams,
  replyCreateInput,
  threadCreateInput,
  threadListQuery,
} from "@overpass/shared";

export const idParams = z.object({ id: z.uuid({ error: "id_invalid" }) });
