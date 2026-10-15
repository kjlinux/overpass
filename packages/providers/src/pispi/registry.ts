import { randomUUID } from "node:crypto";
import type { EndpointInput } from "@overpass/simulator";
import protocol from "./protocol.json" with { type: "json" };
import { json, noContent, parseBody, problems } from "./problem.js";
import { aliasCreate, webhookCreate } from "./schemas.js";

type Input = EndpointInput<unknown>;
type Alias = { cle: string; type: string; compte: string; dateCreation: string };
type Hook = {
  id: string;
  callbackUrl: string;
  alias?: string | undefined;
  events: string[];
  dateCreation: string;
  secret: string;
};

const aliasKind = "alias";
const hookKind = "webhook";
const aliasLimit = 20;
const hookLimit = 20;

const aliasesOf = async (input: Input, compte: string) =>
  ((await input.store.list(aliasKind)) as (Alias & { deleted?: boolean })[]).filter(
    (alias) => alias.compte === compte && alias.deleted !== true,
  );

/** MCOD keys follow the shape of the documented example: country, F00_, five characters. */
function keyFor(type: string, compte: string, newId: () => string): string {
  return type === "SHID"
    ? randomUUID()
    : `${compte.slice(0, 2).toUpperCase()}F00_${newId().slice(-5).toUpperCase()}`;
}

export async function createAlias(input: Input) {
  const parsed = parseBody(aliasCreate, input.request.body);
  if ("refusal" in parsed) return { response: parsed.refusal };
  const compte = input.params.numero ?? "";
  if ((await aliasesOf(input, compte)).length >= aliasLimit) {
    return {
      response: problems.forbidden(protocol.aliasLimit, [
        { name: "cle", reason: protocol.aliasLimitReason },
      ]),
    };
  }
  const alias: Alias = {
    cle: keyFor(parsed.value.type, compte, input.newId),
    type: parsed.value.type,
    compte,
    dateCreation: input.now.toISOString(),
  };
  await input.store.put(aliasKind, alias.cle, alias);
  return { response: json(200, alias) };
}

export async function listAliases(input: Input) {
  const data = await aliasesOf(input, input.params.numero ?? "");
  return {
    response: json(200, {
      data,
      meta: { total: data.length, size: data.length, page: "1", next: null, prev: null },
    }),
  };
}

export async function deleteAlias(input: Input) {
  const alias = (await input.store.get(aliasKind, input.params.cle ?? "")) as Alias | undefined;
  if (alias === undefined || alias.compte !== input.params.numero)
    return { response: problems.notFound() };
  await input.store.put(aliasKind, alias.cle, { ...alias, deleted: true });
  return { response: noContent() };
}

export async function readAlias(input: Input) {
  const alias = (await input.store.get(aliasKind, input.params.cle ?? "")) as
    (Alias & { deleted?: boolean }) | undefined;
  if (alias === undefined || alias.deleted === true) return { response: problems.notFound() };
  const client = {
    nom: protocol.simulatorPayerName,
    pays: alias.compte.slice(0, 2).toUpperCase(),
    categorie: "B",
  };
  return { response: json(200, { client, alias: { cle: alias.cle } }) };
}

const hooks = async (input: Input) =>
  ((await input.store.list(hookKind)) as (Hook & { deleted?: boolean })[]).filter(
    (hook) => hook.deleted !== true,
  );

export async function createHook(input: Input) {
  const parsed = parseBody(webhookCreate, input.request.body);
  if ("refusal" in parsed) return { response: parsed.refusal };
  const existing = await hooks(input);
  if (existing.some((hook) => hook.callbackUrl === parsed.value.callbackUrl))
    return { response: problems.conflict() };
  if (existing.length >= hookLimit) return { response: problems.forbidden(protocol.webhookLimit) };
  const hook: Hook = {
    id: randomUUID(),
    ...parsed.value,
    events: parsed.value.events ?? [],
    dateCreation: input.now.toISOString(),
    secret: protocol.simulatorSecretNote,
  };
  await input.store.put(hookKind, hook.id, hook);
  return { response: json(201, hook) };
}

export async function listHooks(input: Input) {
  const data = await hooks(input);
  return { response: json(200, { data, meta: { total: data.length } }) };
}

export async function deleteHook(input: Input) {
  const hook = (await input.store.get(hookKind, input.params.id ?? "")) as Hook | undefined;
  if (hook === undefined) return { response: problems.notFound() };
  await input.store.put(hookKind, hook.id, { ...hook, deleted: true });
  return { response: noContent() };
}
