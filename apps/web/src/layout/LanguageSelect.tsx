import { languageNames, supportedLanguages } from "@overpass/shared";
import type { Language } from "@overpass/shared";
import type { JSX } from "preact";
import { useLocation } from "preact-iso";
import { useTranslation } from "react-i18next";
import { Select } from "../components/ui";
import { rememberLanguage, toLanguage } from "../app/language";
import { localizedPath, pathWithoutLanguage } from "./nav";

/** A labelled select listing every supported language by its own name. */
export function LanguageSelect({ language }: { language: Language }): JSX.Element {
  const { t } = useTranslation("layout");
  const { path, route } = useLocation();

  const onChange = (event: Event): void => {
    const next = toLanguage((event.currentTarget as HTMLSelectElement).value);
    if (next === undefined) return;
    rememberLanguage(next);
    route(localizedPath(next, pathWithoutLanguage(path)));
  };

  return (
    <label class="inline-flex items-center">
      <span class="sr-only">{t("language")}</span>
      <Select
        name="language"
        value={language}
        onChange={onChange}
        class="w-auto"
        options={supportedLanguages.map((code) => ({ value: code, label: languageNames[code] }))}
      />
    </label>
  );
}
