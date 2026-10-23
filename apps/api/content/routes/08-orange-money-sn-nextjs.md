---
title: "Encaisser un paiement Orange Money au Sénégal depuis Next.js"
service: orange-money
country: SN
stack: nextjs
language: fr
---

Source : Orange Money Web Payment API sur developer.orange.com (apis/om-webpay), consultée le 23 octobre 2026. Exemple avec Next.js 15, App Router, route handlers côté serveur.

## Prérequis

- Un compte marchand Orange Money Sénégal et une application developer.orange.com avec l'API Web Payment activée pour `sn`.
- L'en-tête d'autorisation (Basic) et la clé marchande du portail.
- Node.js 20 ou plus.

## Installation

```
OM_AUTH_HEADER="Basic xxxxxxxx"
OM_MERCHANT_KEY=xxxxxxxx
OM_COUNTRY=sn
OM_BASE=https://api.orange.com
```

Tout ce qui touche à ces variables vit dans des fichiers serveur (`app/api/...`, `lib/server/...`). Rien ne doit transiter par un composant client.

## Paiement

```ts
// lib/server/orange-money.ts
let cached: { token: string; expiresAt: number } | undefined;

export async function omToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;
  const response = await fetch(`${process.env.OM_BASE}/oauth/v3/token`, {
    method: "POST",
    headers: {
      authorization: process.env.OM_AUTH_HEADER!,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  const body = await response.json();
  cached = { token: body.access_token, expiresAt: Date.now() + body.expires_in * 1000 };
  return cached.token;
}

export async function createPayment(order: { reference: string; totalXof: number }) {
  const base = process.env.NEXT_PUBLIC_APP_URL;
  const response = await fetch(
    `${process.env.OM_BASE}/orange-money-webpay/${process.env.OM_COUNTRY}/v1/webpayment`,
    {
      method: "POST",
      headers: { authorization: `Bearer ${await omToken()}`, "content-type": "application/json" },
      body: JSON.stringify({
        merchant_key: process.env.OM_MERCHANT_KEY,
        currency: process.env.NODE_ENV === "production" ? "XOF" : "OUV",
        order_id: order.reference,
        amount: order.totalXof,
        return_url: `${base}/commande/${order.reference}/retour`,
        cancel_url: `${base}/commande/${order.reference}`,
        notif_url: `${base}/api/webhooks/orange-money`,
        lang: "fr",
        reference: "Boutique Overpass",
      }),
      cache: "no-store",
    },
  );
  if (!response.ok) throw new Error(`orange money ${response.status}: ${await response.text()}`);
  return response.json() as Promise<{ payment_url: string; pay_token: string; notif_token: string }>;
}
```

Dans une Server Action, appelez `createPayment`, enregistrez `pay_token` et `notif_token` sur la commande, puis `redirect(payment_url)`.

## Webhook

```ts
// app/api/webhooks/orange-money/route.ts
export async function POST(request: Request) {
  const body = (await request.json()) as { status: string; notif_token: string; txnid: string };
  const order = await findOrderByNotifToken(body.notif_token);
  if (!order) return new Response(null, { status: 404 });
  if (body.status === "SUCCESS" && !order.paidAt) await markPaid(order.id, body.txnid);
  return new Response(null, { status: 204 });
}
```

Confirmez ensuite par `POST /orange-money-webpay/sn/v1/transactionstatus` avec `order_id`, `amount` et `pay_token`.

## Pièges connus

- Le cache de `fetch` de Next.js peut servir une réponse mémorisée pour le jeton ou le paiement : passez `cache: "no-store"` partout ici.
- Le jeton mis en cache dans une variable de module survit entre requêtes sur un serveur Node, pas sur une plateforme sans état (une fonction par requête). Dans ce cas, stockez-le dans Redis ou acceptez un appel de jeton par paiement.
- La devise du bac à sable est `OUV`, pas `XOF`.
- `return_url` est appelée par le navigateur du client : jamais de livraison sur cette seule base, la notification et la vérification d'état font foi.
- `order_id` doit être unique. En cas de nouvel essai, générez une référence suffixée.
- Les numéros sénégalais ont neuf chiffres ; l'API Web Payment ne les demande pas, le client s'identifie sur la page Orange.
