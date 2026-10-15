import type { Endpoint, EndpointInput, EndpointResult, HttpMethod } from "@overpass/simulator";
import type { ZodType } from "zod";
import { issueToken, requireBearer } from "./auth.js";
import { listReceived, paymentByEnd2endId, receivedByTxId, returnFunds } from "./payments.js";
import {
  createAlias,
  createHook,
  deleteAlias,
  deleteHook,
  listAliases,
  listHooks,
  readAlias,
} from "./registry.js";
import { confirmRequest, createRequest, listRequests, readRequest } from "./requests.js";
import {
  aliasCreate,
  confirmationBody,
  demande,
  demandeRequest,
  listOf,
  problemDocument,
  tokenForm,
  tokenResponse,
  webhookCreate,
} from "./schemas.js";
import type { PispiOutcome } from "./settle.js";

type Handler = (input: EndpointInput<PispiOutcome>) => Promise<EndpointResult>;
type Docs = { body?: ZodType; responses: Record<number, ZodType | null> };

/** Every endpoint but the token one answers 401 without a live bearer token. */
const guarded =
  (handler: Handler): Handler =>
  async (input) => {
    const refusal = await requireBearer(input);
    return refusal === undefined ? handler(input) : { response: refusal };
  };

const errors = { 400: problemDocument, 401: problemDocument, 404: problemDocument };
const route = (
  method: HttpMethod,
  path: string,
  handle: Handler,
  docs: Docs,
): Endpoint<PispiOutcome> => ({
  method,
  path: `/piz/v1${path}`,
  handle: guarded(handle),
  docs: {
    ...(docs.body === undefined ? {} : { body: docs.body }),
    responses: { ...errors, ...docs.responses },
  },
});

/** Paths of the API Business specification 1.5.0, under its /piz/v1 server. */
export const pispiEndpoints: Endpoint<PispiOutcome>[] = [
  {
    method: "POST",
    path: "/oauth/token",
    handle: issueToken,
    docs: { body: tokenForm, responses: { 200: tokenResponse, 400: problemDocument } },
  },
  route("POST", "/demandes-paiements", createRequest, {
    body: demandeRequest,
    responses: { 200: demande },
  }),
  route("GET", "/demandes-paiements", listRequests, { responses: { 200: listOf(demande) } }),
  route("GET", "/demandes-paiements/:txId", readRequest, { responses: { 200: demande } }),
  route("PUT", "/demandes-paiements/:txId/confirmations", confirmRequest, {
    body: confirmationBody,
    responses: { 200: demande, 403: problemDocument },
  }),
  route("GET", "/paiements-recus", listReceived, { responses: { 200: listOf(demande) } }),
  route("GET", "/paiements-recus/:txId", receivedByTxId, { responses: { 200: demande } }),
  route("GET", "/paiements/:end2endId", paymentByEnd2endId, { responses: { 200: demande } }),
  route("PUT", "/paiements/:end2endId/retours", returnFunds, { responses: { 200: demande } }),
  route("POST", "/comptes/:numero/alias", createAlias, {
    body: aliasCreate,
    responses: { 200: null, 403: problemDocument },
  }),
  route("GET", "/comptes/:numero/alias", listAliases, { responses: { 200: null } }),
  route("DELETE", "/comptes/:numero/alias/:cle", deleteAlias, { responses: { 204: null } }),
  route("GET", "/alias/:cle", readAlias, { responses: { 200: null } }),
  route("POST", "/webhooks", createHook, {
    body: webhookCreate,
    responses: { 201: null, 409: problemDocument },
  }),
  route("GET", "/webhooks", listHooks, { responses: { 200: null } }),
  route("DELETE", "/webhooks/:id", deleteHook, { responses: { 204: null } }),
];
