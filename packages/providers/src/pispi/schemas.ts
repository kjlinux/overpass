import { z } from "zod";

const uuid = z.uuid();
const categorie = z.union([
  z.enum(["500", "521", "401"]),
  z.literal(500),
  z.literal(521),
  z.literal(401),
]);

export const tokenForm = z.object({
  grant_type: z.literal("client_credentials"),
  client_id: z.string().min(1),
  client_secret: z.string().min(1),
  scope: z.string().optional(),
});

export const tokenResponse = z.object({
  access_token: z.string(),
  token_type: z.literal("Bearer"),
  expires_in: z.number(),
  scope: z.string(),
});

/** DemandePaiementRequestBase plus the category and deadline fields of its variants. */
export const demandeRequest = z
  .object({
    txId: z.string().min(1).max(35),
    confirmation: z.boolean(),
    payeurAlias: uuid,
    payeAlias: uuid,
    montant: z.number().min(1),
    categorie,
    logoUrl: z.string().min(1).max(140).optional(),
    motif: z.string().min(2).max(140).optional(),
    refDocNumero: z.string().min(1).max(35).optional(),
    dateLimitePaiement: z.iso.datetime({ offset: true }).optional(),
  })
  .refine((body) => String(body.categorie) === "500" || body.dateLimitePaiement !== undefined, {
    path: ["dateLimitePaiement"],
  });

export const statuts = ["INITIE", "ANNULE", "ENVOYE", "IRREVOCABLE", "REJETE"] as const;

export const demande = z.object({
  txId: z.string(),
  payeurAlias: z.string(),
  payeAlias: z.string(),
  montant: z.number(),
  categorie: z.string(),
  confirmation: z.boolean(),
  statut: z.enum(statuts),
  statutRaison: z.string().optional(),
  payeurNom: z.string().optional(),
  payeurPays: z.string().optional(),
  end2endId: z.string().optional(),
  dateDemande: z.string(),
  dateEnvoi: z.string().optional(),
  dateConfirmation: z.string().optional(),
  dateIrrevocabilite: z.string().optional(),
  dateReponse: z.string().optional(),
});

export const confirmationBody = z.strictObject({ decision: z.boolean() });
export const aliasCreate = z.strictObject({ type: z.enum(["MCOD", "SHID"]) });
export const webhookCreate = z.object({
  callbackUrl: z.url({ protocol: /^https$/ }),
  alias: z.string().optional(),
  events: z.array(z.string()).optional(),
});

const meta = z.object({ total: z.number() });
export const listOf = <Item extends z.ZodType>(item: Item) =>
  z.object({ data: z.array(item), meta });

export const webhookEvent = z.object({
  evCode: z.string(),
  evDate: z.string(),
  txId: z.string().optional(),
  end2endId: z.string(),
  montant: z.number(),
  client: z.string().optional(),
  alias: z.string().optional(),
  motif: z.string().optional(),
});
export const webhookEvents = z.object({ data: z.array(webhookEvent), meta });

export const problemDocument = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number(),
  detail: z.string(),
  "invalid-params": z.array(z.object({ name: z.string(), reason: z.string() })).optional(),
});
