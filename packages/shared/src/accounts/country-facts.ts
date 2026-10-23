import type { Country } from "./countries.js";

export type CountryFacts = {
  /** International prefix, with its plus sign. */
  dialling: string;
  /** ISO 4217 code of the currency the operators settle in. */
  currency: string;
  /** Minor units of that currency; the CFA francs have none. */
  decimals: 0 | 2;
  /** Digits of a national mobile number, without the prefix. */
  mobileDigits: number;
};

const facts = (
  dialling: string,
  currency: string,
  decimals: 0 | 2,
  mobileDigits: number,
): CountryFacts => ({ dialling, currency, decimals, mobileDigits });

/** Countries of the catalogue; numbering plans checked on 2026-10-23 (CI 2021, BJ late 2024). */
export const countryFacts: Partial<Record<Country, CountryFacts>> = {
  BJ: facts("+229", "XOF", 0, 10),
  BF: facts("+226", "XOF", 0, 8),
  BW: facts("+267", "BWP", 2, 8),
  CD: facts("+243", "CDF", 2, 9),
  CF: facts("+236", "XAF", 0, 8),
  CG: facts("+242", "XAF", 0, 9),
  CI: facts("+225", "XOF", 0, 10),
  CM: facts("+237", "XAF", 0, 9),
  EG: facts("+20", "EGP", 2, 10),
  ET: facts("+251", "ETB", 2, 9),
  GA: facts("+241", "XAF", 0, 8),
  GH: facts("+233", "GHS", 2, 9),
  GM: facts("+220", "GMD", 2, 7),
  GN: facts("+224", "GNF", 0, 9),
  GW: facts("+245", "XOF", 0, 9),
  KE: facts("+254", "KES", 2, 9),
  LR: facts("+231", "LRD", 2, 9),
  LS: facts("+266", "LSL", 2, 8),
  MG: facts("+261", "MGA", 2, 9),
  ML: facts("+223", "XOF", 0, 8),
  MR: facts("+222", "MRU", 2, 8),
  MW: facts("+265", "MWK", 2, 9),
  MZ: facts("+258", "MZN", 2, 9),
  NE: facts("+227", "XOF", 0, 8),
  NG: facts("+234", "NGN", 2, 10),
  RW: facts("+250", "RWF", 0, 9),
  SC: facts("+248", "SCR", 2, 7),
  SL: facts("+232", "SLE", 2, 8),
  SN: facts("+221", "XOF", 0, 9),
  SS: facts("+211", "SSP", 2, 9),
  SZ: facts("+268", "SZL", 2, 8),
  TD: facts("+235", "XAF", 0, 8),
  TG: facts("+228", "XOF", 0, 8),
  TZ: facts("+255", "TZS", 2, 9),
  UG: facts("+256", "UGX", 0, 9),
  ZA: facts("+27", "ZAR", 2, 9),
  ZM: facts("+260", "ZMW", 2, 9),
};

export function factsOf(code: string): CountryFacts | null {
  return (countryFacts as Record<string, CountryFacts | undefined>)[code] ?? null;
}
