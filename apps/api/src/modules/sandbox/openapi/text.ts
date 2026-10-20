import { readLocales } from "@overpass/shared";
import type { Language } from "@overpass/shared";
import type catalogue from "../locales/en.json";

type Copy = typeof catalogue;

export type OpenApiText = Copy["openapi"];

const texts = readLocales<Copy>(new URL("../locales/", import.meta.url));

export const openApiText = (language: Language): OpenApiText => texts[language].openapi;
