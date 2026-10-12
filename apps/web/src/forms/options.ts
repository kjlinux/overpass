import { africanCountries, countryName, stackIds, stackNames } from "@overpass/shared";
import type { SelectOption } from "../components/ui";

/** Countries named in the interface language, sorted for that language. */
export function countryOptions(language: string): SelectOption[] {
  return africanCountries
    .map((code) => ({ value: code, label: countryName(code, language) }))
    .sort((a, b) => a.label.localeCompare(b.label, language));
}

export const stackOptions: SelectOption[] = stackIds.map((id) => ({
  value: id,
  label: stackNames[id],
}));
