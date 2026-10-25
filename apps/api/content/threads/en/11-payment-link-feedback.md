---
title: "Looking for feedback on my cross-border payment link MVP"
topic: projects
language: en
author: chidi-eth
at: 2026-10-24T16:20
country: NG
stack: nextjs
---

Hi everyone,

I have been building a small tool for freelancers in Lagos who get paid by clients in Ghana and Côte d'Ivoire. You create a payment link, the client pays in their local currency with mobile money, you receive naira.

Stack: Next.js, PostgreSQL, a queue for the payout jobs. Right now it only works on test providers.

What I would love feedback on:

- Would you trust a link like this as a client?
- What would make you stop halfway through the payment?

Happy to share the test link in private.

@@ author=kofi-builds at=2026-10-24T16:58 useful=chidi-eth @@
As a client in Accra, the first thing I check is who receives the money. Show the freelancer's name and the exact amount in cedis before I type my number, not after.

@@ author=awa-kone at=2026-10-24T17:40 useful=chidi-eth,kofi-builds @@
Designer hat on: keep the page to one screen on a small phone, no scroll before the pay button. And say how long the payment usually takes. Silence after "confirm on your phone" is where people leave.

@@ author=fatou-diallo at=2026-10-24T18:25 @@
Great idea. Think early about refunds and disputes: who pays the fees when a client pays twice by mistake? It shapes your data model more than you think.

@@ author=chidi-eth at=2026-10-24T20:05 @@
This is gold, thank you. Adding the amount and name above the fold tonight, and I am writing down the refund question before it bites me.
