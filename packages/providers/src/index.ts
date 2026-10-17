import type { SimulatedProvider } from "@overpass/simulator";
import { CinetPayProvider } from "./cinetpay/index.js";
import { PayDunyaProvider } from "./paydunya/index.js";
import { PiSpiProvider } from "./pispi/index.js";
import { WaveProvider } from "./wave/index.js";

export { CinetPayProvider } from "./cinetpay/index.js";
export { PayDunyaProvider } from "./paydunya/index.js";
export { PiSpiProvider } from "./pispi/index.js";
export { WaveProvider } from "./wave/index.js";

export const waveProvider = new WaveProvider();
export const cinetpayProvider = new CinetPayProvider();
export const pispiProvider = new PiSpiProvider();
export const paydunyaProvider = new PayDunyaProvider();

export const defaultProviders: readonly SimulatedProvider[] = [
  waveProvider,
  cinetpayProvider,
  pispiProvider,
  paydunyaProvider,
];

export const providers = defaultProviders.map((p) => p.identity);
