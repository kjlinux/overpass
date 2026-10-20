import type { ProviderAdapter } from "@overpass/simulator";
import { discoverProviders } from "./discover.js";

export const providers: readonly ProviderAdapter[] = await discoverProviders(
  new URL("./", import.meta.url),
);
