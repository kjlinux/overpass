import { z } from "zod";

export {
  issueCreateInput,
  issueDraftQuery,
  issueUpdateInput,
  newsletterTokenInput,
  subscribeInput,
} from "@overpass/shared";

export const idParams = z.object({ id: z.uuid({ error: "id_invalid" }) });

/** Mail clients send the one-click token in the query string, the web page in the body. */
export const tokenQuery = z.object({ token: z.string().max(200).optional() });
