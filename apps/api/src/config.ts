import { z } from "zod";

const flag = z.enum(["true", "false"]).transform((value) => value === "true");

const configSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    API_HOST: z.string().default("127.0.0.1"),
    API_PORT: z.coerce.number().int().positive().default(3000),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
      .default("info"),
    TRUST_PROXY: flag.default(false),
    DATABASE_URL: z.url(),
    SESSION_SECRET: z.string().min(32),
    WEB_ORIGIN: z.url().default("http://127.0.0.1:5173"),
    SMTP_HOST: z.string().min(1).optional(),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_SECURE: flag.default(false),
    SMTP_USER: z.string().min(1).optional(),
    SMTP_PASSWORD: z.string().min(1).optional(),
    MAIL_FROM: z.string().min(3).default("Overpass <no-reply@localhost>"),
  })
  .refine((config) => config.NODE_ENV !== "production" || config.SMTP_HOST !== undefined, {
    path: ["SMTP_HOST"],
  });

export type Config = z.infer<typeof configSchema>;

/** Reads and validates the API configuration from the environment. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return configSchema.parse(env);
}
