import type { FastifyInstance, FastifyRequest } from "fastify";
import { AppError } from "../../http/app-error.js";

const minute = 60 * 1000;

/** Per-IP budgets of the authentication routes. */
export const limits = {
  register: { max: 10, timeWindow: 60 * minute },
  confirm: { max: 20, timeWindow: 60 * minute },
  login: { max: 10, timeWindow: 15 * minute },
  logout: { max: 30, timeWindow: minute },
  forgot: { max: 5, timeWindow: 15 * minute },
  reset: { max: 10, timeWindow: 15 * minute },
  password: { max: 10, timeWindow: 15 * minute },
  deletion: { max: 5, timeWindow: 15 * minute },
  tokens: { max: 30, timeWindow: 60 * minute },
};

/** Per-address budgets against mail bombing; login has none, so nobody can lock an account out. */
export const addressLimits = {
  register: { max: 3, timeWindow: 15 * minute },
  forgot: { max: 3, timeWindow: 15 * minute },
};

/** One key per inbox: many providers ignore the +tag and the dots, so aliases share a budget. */
export function addressKey(email: string): string {
  const address = email.trim().toLowerCase();
  const at = address.lastIndexOf("@");
  if (at === -1) return address;
  const local = (address.slice(0, at).split("+")[0] ?? "").replaceAll(".", "");
  return `${local}${address.slice(at)}`;
}

function addressOf(request: FastifyRequest): string {
  const email = (request.body as { email?: unknown } | undefined)?.email;
  return typeof email === "string" ? addressKey(email) : request.ip;
}

/** A second limiter keyed on the e-mail of the body, run after the per-IP one. */
export function addressLimiter(app: FastifyInstance, name: keyof typeof addressLimits) {
  const check = app.createRateLimit({
    ...addressLimits[name],
    keyGenerator: (request) => `${name}:${addressOf(request)}`,
  });
  return async (request: FastifyRequest) => {
    const result = await check(request);
    if (!result.isAllowed && result.isExceeded) throw new AppError("rate_limited", 429);
  };
}
