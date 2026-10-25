---
title: "How we built the simulators"
kind: news
category: tutorials
language: en
group: simulators
cover: covers/simulators.png
summary: "Four operators replayed from their public documentation, without logos, marked unofficial: the method and its limits."
publishedAt: 2026-10-23
---

The Overpass Simulator replays Wave, PayDunya, CinetPay and PI-SPI. Here is how each simulator is made, and what it does not claim to be.

## One source: public documentation

Each operator is a folder in the repository, with a protocol file quoting its source and consultation date. Wave comes from docs.wave.com (Checkout and Webhooks). PayDunya from developers.paydunya.com. CinetPay from the README of its official PHP SDK 3.0.1 on GitHub. PI-SPI from the API Business specification 1.5.0 published by the BCEAO.

When the documentation leaves out a detail, a path or the text of a refusal, the simulator makes a choice and says so: its messages start with "Overpass simulator". No logo, no brand colour, and the word "unofficial" everywhere.

## What the simulator reproduces

- The documented routes, bodies and response codes.
- Authentication as the operator describes it: Bearer token for Wave, key headers for PayDunya, login then token for CinetPay, OAuth 2 for PI-SPI.
- Webhooks with their real signature. For Wave, the `Wave-Signature` header is computed exactly as in production, over the same bytes: the verification code you write against the simulator works unchanged against the operator.
- The failure cases the documentation names: insufficient balance, session not found, invalid amount, expired token, quota exceeded.

## What it does not reproduce

- The real delays of a customer typing a PIN: the simulator answers within seconds.
- The operator's screens: there is no payment page, the scenario is chosen by a value in the request.
- Undocumented cases. If you meet one in production, that is exactly what an Overpass itinerary should tell.

## Webhooks on your machine

Receiving a webhook usually requires a public URL. The `npx overpass-cli listen` command opens an outbound connection and replays each delivery on your local server, no tunnel, no certificate, body and headers passed through unchanged. Deliveries are kept seven days, then purged.

## And the other operators

Orange Money, Moov Money, MTN MoMo and the others are in the catalogue without a simulator. On each service page, an "I want a simulator" button counts the votes: that is what decides the next one.
