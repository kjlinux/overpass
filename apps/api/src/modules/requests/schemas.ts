import { z } from "zod";

export { proposalCreateInput, proposalDecisionInput, serviceSlugParams } from "@overpass/shared";

export const idParams = z.object({ id: z.uuid({ error: "id_invalid" }) });
