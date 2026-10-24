---
title: "PI-SPI: BCEAO launched WAEMU's interoperable instant payment platform"
kind: news
category: tech-news
language: en
group: bceao-pispi
cover: covers/bceao-pispi.png
summary: "What the platform changes for a developer in the eight countries of the Union, and how to start without waiting for a certificate."
publishedAt: 2026-10-23
---

The Central Bank of West African States officially launched PI-SPI, the interoperable platform of WAEMU's instant payment system. Source: the launch communiqué published on bceao.int, consulted on 23 October 2026.

## What it is

A shared infrastructure for the eight countries of the Union (Benin, Burkina Faso, Côte d'Ivoire, Guinea-Bissau, Mali, Niger, Senegal, Togo) linking banks, electronic money issuers and other participants for instant account-to-account payments, whatever the provider on each side.

For a developer the interest is twofold: a single business API, called the API Business, and aliases (phone number, merchant id) to name a payer without knowing their bank or operator.

## What it changes

- An online shop in Senegal can be paid by a customer in Mali without integrating that customer's operator.
- Payment requests replace the redirect to a third-party page: the merchant creates the request, the customer confirms it with their provider, the merchant receives the result by webhook.
- Participants remain the intermediaries: a business reaches PI-SPI through its bank or electronic money issuer, not directly.

## What slows things down today

The official sandbox requires a client certificate (mutual TLS) and registration with a participant. Healthy for production, but it blocks the first day of anyone who just wants to try.

That is why Overpass offers a PI-SPI simulator: the same routes as specification 1.5.0, no certificate, failure scenarios included, and a pointer to the official sandbox when you are ready. The step-by-step guide is on this blog, and the Node.js itinerary for Senegal gives the full code.
