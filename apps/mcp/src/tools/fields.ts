import { supportedLanguages } from "@overpass/shared";
import { z } from "zod";

export const countryField = z
  .string()
  .regex(/^[A-Za-z]{2}$/)
  .toUpperCase();
export const slugField = z.string().min(1).max(60);
export const languageField = z.enum(supportedLanguages);
export const idField = z.uuid();
