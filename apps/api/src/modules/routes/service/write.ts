import { routeTemplate } from "@overpass/shared";
import type { RouteCreateInput, RouteUpdateInput } from "@overpass/shared";
import { AppError } from "../../../http/app-error.js";
import type { Account } from "../../accounts/index.js";
import { TranslationExists } from "../model.js";
import type { RoutePatch } from "../model.js";
import { assertCanEdit, serviceIdOf } from "./context.js";
import type { RoutesDeps } from "./context.js";

/** The group of the source route, refusing a second version in the same language. */
async function translationGroupOf(deps: RoutesDeps, input: RouteCreateInput) {
  if (input.translationOf === undefined) return undefined;
  const source = await deps.repository.findLive(input.translationOf);
  if (source === null) throw new AppError("not_found", 404);
  if (source.language === input.language) throw new AppError("translation_exists", 409);
  return source.translationGroup;
}

async function editableRoute(deps: RoutesDeps, id: string, account: Account) {
  const route = await deps.repository.findLive(id);
  if (route === null) throw new AppError("not_found", 404);
  assertCanEdit(route, account);
  return route;
}

async function createRoute(deps: RoutesDeps, account: Account, input: RouteCreateInput) {
  const serviceId = await serviceIdOf(deps.repository, input.service);
  const translationGroup = await translationGroupOf(deps, input);
  const at = deps.now();
  const { country, stack, language, title, content } = input;
  try {
    return await deps.repository.insertRoute({
      ...{ country, stack, language, title, serviceId, translationGroup },
      authorId: account.id,
      content: content ?? routeTemplate(language),
      createdAt: at,
      updatedAt: at,
    });
  } catch (error) {
    if (error instanceof TranslationExists) throw new AppError("translation_exists", 409);
    throw error;
  }
}

async function patchOf(deps: RoutesDeps, input: RouteUpdateInput): Promise<RoutePatch> {
  const { service, ...fields } = input;
  const serviceId = service === undefined ? undefined : await serviceIdOf(deps.repository, service);
  const entries = Object.entries({ ...fields, serviceId });
  return Object.fromEntries(entries.filter(([, value]) => value !== undefined));
}

export function writeService(deps: RoutesDeps) {
  return {
    create: async (account: Account, input: RouteCreateInput): Promise<string> => {
      const id = await createRoute(deps, account, input);
      await deps.onContribution([account.id]);
      return id;
    },

    update: async (account: Account, id: string, input: RouteUpdateInput): Promise<void> => {
      await editableRoute(deps, id, account);
      const patch = await patchOf(deps, input);
      if (!(await deps.repository.updateRoute(id, patch, account.id, deps.now()))) {
        throw new AppError("not_found", 404);
      }
    },

    remove: async (account: Account, id: string): Promise<void> => {
      const route = await editableRoute(deps, id, account);
      await deps.repository.softDelete(id, deps.now());
      await deps.onContribution([route.authorId]);
    },
  };
}
