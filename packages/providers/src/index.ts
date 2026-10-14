import type { ProviderAdapter } from "@overpass/simulator";
import { wave } from "./wave/index.js";

export const providers: readonly ProviderAdapter[] = [wave];
