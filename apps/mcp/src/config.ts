import { supportedLanguages } from "@overpass/shared";
import { z } from "zod";

const optionalText = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);

const configSchema = z
  .object({
    OVERPASS_API_URL: z
      .url({ protocol: /^https?$/ })
      .default("http://127.0.0.1:3000")
      .transform((url) => url.replace(/\/+$/, "")),
    OVERPASS_LANG: z.enum(supportedLanguages).default("en"),
    OVERPASS_TOKEN: optionalText,
    MCP_HOST: z.string().min(1).default("127.0.0.1"),
    MCP_PORT: z.coerce.number().int().min(0).max(65535).default(3100),
  })
  .transform((env) => ({
    apiUrl: env.OVERPASS_API_URL,
    language: env.OVERPASS_LANG,
    host: env.MCP_HOST,
    port: env.MCP_PORT,
    token: env.OVERPASS_TOKEN,
  }));

export type Config = z.infer<typeof configSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return configSchema.parse(env);
}
