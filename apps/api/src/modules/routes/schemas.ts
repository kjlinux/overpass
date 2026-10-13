import { z } from "zod";

export {
  routeCreateInput,
  routeListQuery,
  routeReadQuery,
  routeUpdateInput,
} from "@overpass/shared";

export const idParams = z.object({ id: z.uuid({ error: "id_invalid" }) });
