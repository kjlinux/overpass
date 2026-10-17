import type { SimulatedProvider } from "@overpass/simulator";
import { CinetPayProvider } from "./cinetpay/index.js";
import { WaveProvider } from "./wave/index.js";

export { CinetPayProvider } from "./cinetpay/index.js";
export { WaveProvider } from "./wave/index.js";

export const waveProvider = new WaveProvider();
export const cinetpayProvider = new CinetPayProvider();

export const defaultProviders: readonly SimulatedProvider[] = [waveProvider, cinetpayProvider];

export const providers = defaultProviders.map((p) => p.identity);
