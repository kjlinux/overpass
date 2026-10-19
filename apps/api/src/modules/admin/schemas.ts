import { z } from "zod";

export {
  adminAccountsQuery,
  adminLogQuery,
  adminQueueQuery,
  routeModerationInput,
  suspensionInput,
} from "@overpass/shared";

export const idParams = z.object({ id: z.uuid({ error: "id_invalid" }) });
