import { z } from "zod";

export { checkCreateInput, potholeCreateInput, potholeUpdateInput } from "@overpass/shared";

export const idParams = z.object({ id: z.uuid({ error: "id_invalid" }) });
