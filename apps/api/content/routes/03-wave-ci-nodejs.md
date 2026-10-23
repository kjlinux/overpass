---
title: "Encaisser un paiement Wave Checkout en Côte d'Ivoire depuis Node.js"
service: wave
country: CI
stack: nodejs
language: fr
---

Source : docs.wave.com, pages Checkout API et Webhooks, consultées le 23 octobre 2026. Exemple avec Express 5 et Node 22 ; la piste d'essai Overpass rejoue cette API.

## Prérequis

- Un compte Wave Business en Côte d'Ivoire. La clé commence par `wave_ci_`.
- Un secret de webhook créé depuis le portail Business.
- Node.js 20 ou plus, `fetch` natif, Express 5.

## Installation

```
npm install express
```

```
WAVE_API_KEY=wave_ci_test_xxxxxxxx
WAVE_WEBHOOK_SECRET=wave_whs_xxxxxxxx
```

## Paiement

```js
export async function createSession(order) {
  const response = await fetch("https://api.wave.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.WAVE_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      amount: String(order.totalXof),
      currency: "XOF",
      client_reference: order.reference,
      success_url: `${process.env.APP_URL}/orders/${order.id}/paid`,
      error_url: `${process.env.APP_URL}/orders/${order.id}/failed`,
    }),
  });
  if (!response.ok) throw new Error(`wave ${response.status}: ${await response.text()}`);
  return response.json();
}
```

Gardez `session.id` sur la commande et redirigez vers `session.wave_launch_url`.

## Webhook

Express doit garder le corps brut : montez `express.raw` sur cette route seule, avant tout parseur JSON.

```js
import { createHmac, timingSafeEqual } from "node:crypto";

app.post("/webhooks/wave", express.raw({ type: "*/*" }), (request, response) => {
  const header = Object.fromEntries(
    String(request.get("wave-signature") ?? "").split(",").map((part) => part.split("=")),
  );
  const expected = createHmac("sha256", process.env.WAVE_WEBHOOK_SECRET)
    .update(`${header.t}${request.body.toString("utf8")}`)
    .digest("hex");
  const given = Buffer.from(header.v1 ?? "", "hex");
  const ok = given.length === 32 && timingSafeEqual(given, Buffer.from(expected, "hex"));
  if (!ok || Math.abs(Date.now() / 1000 - Number(header.t)) > 300) return response.sendStatus(401);

  const event = JSON.parse(request.body.toString("utf8"));
  if (event.type === "checkout.session.completed") markPaid(event.data.id);
  response.sendStatus(204);
});
```

## Pièges connus

- `express.json()` monté globalement consomme le corps avant votre route : la signature ne correspond plus. Montez le parseur brut sur la route du webhook, ou avant le parseur JSON.
- Le montant est une chaîne. `amount: 1500` (nombre) est refusé.
- `wave_launch_url` ouvre l'application Wave sur mobile et une page web sur ordinateur : ne l'ouvrez pas dans une iframe.
- Les numéros ivoiriens ont dix chiffres depuis 2021 (ARTCI). Si vous affichez le numéro du payeur reçu dans l'événement, ne le tronquez pas à huit.
- Le même événement peut être livré deux fois : `markPaid` doit être idempotent.
- Avec le relais local d'Overpass (`npx overpass listen --forward-to http://localhost:3000/webhooks/wave`), les en-têtes et le corps arrivent inchangés, la vérification ci-dessus fonctionne donc telle quelle.
