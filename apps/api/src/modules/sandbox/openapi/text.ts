import type { Language } from "@overpass/shared";
import en from "../locales/en.json" with { type: "json" };
import fr from "../locales/fr.json" with { type: "json" };

export type OpenApiText = typeof en.openapi;

const texts: Record<Language, OpenApiText> = { fr: fr.openapi, en: en.openapi };

export const openApiText = (language: Language): OpenApiText => texts[language];
