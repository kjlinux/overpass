import { z } from "zod";

const flag = z.enum(["true", "false"]).transform((value) => value === "true");

/** An empty line in .env means "not set". */
const optionalText = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);

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
    SMTP_HOST: optionalText,
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_SECURE: flag.default(false),
    SMTP_USER: optionalText,
    SMTP_PASSWORD: optionalText,
    MAIL_FROM: z.string().min(3).default("Overpass <no-reply@localhost>"),
  })
  .refine((config) => config.NODE_ENV !== "production" || config.SMTP_HOST !== undefined, {
    path: ["SMTP_HOST"],
  });

export type Config = z.infer<typeof configSchema>;

/** Reads and validates the API configuration from the environment. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const config = configSchema.parse(env);
  // Behind a proxy every client would share one IP and one rate-limit budget.
  if (config.NODE_ENV === "production" && env["TRUST_PROXY"] === undefined) {
    throw new Error("TRUST_PROXY must be set explicitly in production");
  }
  return config;
}
