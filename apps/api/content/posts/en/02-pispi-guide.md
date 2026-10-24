---
title: "PI-SPI step by step on the test track"
kind: news
category: tutorials
language: en
group: pispi-guide
cover: covers/pispi-guide.png
summary: "Get a token, create a payment request, watch it get paid and receive the webhook on your machine, in under five minutes."
publishedAt: 2026-10-23
---

PI-SPI is the interoperable instant payment platform of the BCEAO, shared by the eight WAEMU countries. Its official sandbox requires a client certificate: the Overpass test track reproduces the same routes without a certificate, with failure scenarios added, so you can write your integration today and point it at the official sandbox tomorrow.

## 1. A test key

Open the test track, pick PI-SPI and create a key. It acts as the OAuth 2 client id and secret for the simulator. No sign-up is needed for a first try.

## 2. The token

```
POST /v1/sandbox/pi-spi/oauth/token
content-type: application/x-www-form-urlencoded

grant_type=client_credentials&client_id=<key>&client_secret=<secret>
```

The response carries `access_token` and `expires_in`. Cache the token until expiry minus a margin: in production, the call quota answers 429 to anyone asking for a token on every request.

## 3. The payment request

```
POST /v1/sandbox/pi-spi/piz/v1/payment-requests
authorization: Bearer <token>

{ "amount": 2500, "currency": "XOF", "payerAlias": "+221770000000", "reference": "CMD-1042" }
```

The test track answers as specification 1.5.0 describes, with the request id and its initial state. Scenarios are triggered by the amount or the alias: each scenario page gives the value to use to get a refusal, an expiry or a success.

## 4. The webhook on your machine

```
npx overpass-cli listen --forward-to http://localhost:3000/webhooks/pispi
```

The command opens an outbound connection to Overpass and replays every simulator webhook on your local server, body and headers unchanged. The inspector shows each delivery with its response code and duration, and a Replay button. The sandbox page gives the full command, with your test key and the API address.

## 5. Before production

- Ask your PI-SPI participant for the client certificate and the official sandbox credentials.
- Replace the base URL. Routes and bodies do not change.
- Keep the signature check and the re-read of the request before fulfilment: that is what protects you from a replayed or forged webhook.

The itinerary "Create and track a PI-SPI payment request in Senegal from Node.js" gives the full code and the known pitfalls.
