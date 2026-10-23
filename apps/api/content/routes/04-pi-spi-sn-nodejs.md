---
title: "Créer et suivre une demande de paiement PI-SPI au Sénégal depuis Node.js"
service: pi-spi
country: SN
stack: nodejs
language: fr
---

Source : spécification PI-SPI API Business 1.5.0 sur developer.pispi.bceao.int, consultée le 14 octobre 2026 pour le simulateur et relue le 23 octobre 2026. PI-SPI est la plateforme interopérable de paiement instantané de la BCEAO, commune aux huit pays de l'UEMOA.

## Prérequis

- Un enregistrement « business » auprès d'un participant PI-SPI (banque, établissement de monnaie électronique) qui vous remet un identifiant et un secret OAuth 2.
- Sur le bac à sable officiel, un certificat client : l'accès est en TLS mutuel. La piste d'essai Overpass reproduit les mêmes routes sans certificat, pour commencer tout de suite.
- Node.js 20 ou plus.

## Installation

```
PISPI_BASE=https://sandbox.pispi.bceao.int
PISPI_CLIENT_ID=xxxxxxxx
PISPI_CLIENT_SECRET=xxxxxxxx
```

Pour le bac à sable officiel, ajoutez le certificat et la clé au client HTTP (`undici.Agent` avec `connect: { cert, key }`).

## Paiement

```js
let token;

async function accessToken() {
  if (token && token.expiresAt > Date.now() + 30_000) return token.value;
  const response = await fetch(`${process.env.PISPI_BASE}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.PISPI_CLIENT_ID,
      client_secret: process.env.PISPI_CLIENT_SECRET,
    }),
  });
  const body = await response.json();
  token = { value: body.access_token, expiresAt: Date.now() + body.expires_in * 1000 };
  return token.value;
}

export async function requestPayment(order, payerAlias) {
  const response = await fetch(`${process.env.PISPI_BASE}/piz/v1/payment-requests`, {
    method: "POST",
    headers: { authorization: `Bearer ${await accessToken()}`, "content-type": "application/json" },
    body: JSON.stringify({
      amount: order.totalXof,
      currency: "XOF",
      payerAlias,
      reference: order.reference,
      description: `Commande ${order.reference}`,
    }),
  });
  if (response.status === 429) throw new Error("quota PI-SPI dépassé, réessayer plus tard");
  if (!response.ok) throw new Error(`pi-spi ${response.status}: ${await response.text()}`);
  return response.json();
}
```

Les noms exacts des champs dépendent de la version de la spécification que votre participant expose : vérifiez-les dans le document 1.5.0 et dans la piste d'essai, qui les cite.

## Webhook

Le business déclare ses webhooks par l'API, vingt au maximum. Chaque notification porte l'identifiant de la demande et son nouvel état (confirmée, annulée, expirée). Vérifiez la signature avec le secret affiché à la création du webhook, puis relisez la demande par `GET /piz/v1/payment-requests/:id` avant de livrer.

```js
app.post("/webhooks/pispi", express.json(), async (request, response) => {
  const payment = await readPayment(request.body.paymentRequestId);
  if (payment.status === "CONFIRMED") await markPaid(payment.reference);
  response.sendStatus(204);
});
```

## Pièges connus

- Le TLS mutuel du bac à sable officiel bloque la plupart des développeurs le premier jour. Commencez sur la piste d'essai Overpass, puis demandez le certificat à votre participant.
- Les alias (numéro de téléphone, identifiant marchand) ont une limite de création : l'API répond « Dépassement de limite de création d'alias ». Ne créez pas un alias par commande.
- Confirmer ou annuler deux fois la même demande renvoie une erreur explicite (« déjà confirmée », « déjà annulée »). Traitez-la comme un succès idempotent.
- Le quota d'appels renvoie 429. Mettez le jeton en cache et ne sondez pas l'état plus d'une fois toutes les quelques secondes.
- Les montants sont des entiers en XOF.
- Les numéros sénégalais ont neuf chiffres ; les alias téléphoniques se déclarent au format international.
