---
title: "I almost gave up on Mobile Money. Here is what kept me going"
kind: member
author: kofi-builds
category: portraits
language: en
group: member-kofi-momo
summary: "Three weeks of sandbox errors, one angry investor and a delivery app that now takes 400 payments a day in Kumasi. A story about stubbornness and reading the docs twice."
publishedAt: 2026-10-24T15:10
stars: chidi-eth, serge-tech, aminata-codes, fatou-diallo
---

Six months ago I nearly dropped mobile payments from our delivery app and went cash only.

## The three bad weeks

We are a team of three in Kumasi. Riders, restaurants, customers who order on their phones. Everyone pays with MoMo here, so it was obvious we needed it.

What was not obvious was everything else. My first sandbox call returned an error I could not find in any document. Then the callbacks did not arrive. Then they arrived twice (I asked about that here, the answers fixed it in an afternoon). Each fix took days because I had nobody to ask.

Our investor asked in a meeting why "a simple payment button" was three weeks late. I did not have a good answer.

## What kept me going

Honestly? Riders. One of them told me he lost money every week because customers said "I will send it later" and never did. That sentence stayed in my head.

So I stopped trying to do everything at once:

- One provider first, the one most of our customers use.
- Every error written down in a shared file, with the fix.
- A test for every case that had bitten me.

## Where we are now

Around 400 payments a day, cash is under 10 percent of orders, and riders get paid the same evening.

The file of errors became our onboarding document for the next developer. If I had found something like Overpass then, I would have saved those three weeks.

Keep going. The second provider is much faster than the first.

@@ author=chidi-eth at=2026-10-24T15:55 @@
"Every error written down with the fix" is the best advice in this post. That file is worth more than the code.

@@ author=fatou-diallo at=2026-10-24T17:30 @@
The rider story is exactly why we started our school fees project. Parents were losing a day of work to queue at the school. Thanks for sharing, Kofi.
