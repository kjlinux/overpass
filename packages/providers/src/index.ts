import type { ProviderAdapter } from "@overpass/simulator";
import { paydunya } from "./paydunya/index.js";
import { pispi } from "./pispi/index.js";
import { wave } from "./wave/index.js";

export const providers: readonly ProviderAdapter[] = [wave, pispi, paydunya];
