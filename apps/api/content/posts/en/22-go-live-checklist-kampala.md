---
title: "A go-live checklist I wrote after my first payments launch in Kampala"
kind: member
author: grace-ug
category: tutorials
language: en
group: member-grace-golive
summary: "I launched a ticketing site with mobile money payments last month and got three things wrong on day one. This is the short list I now run through before any payment feature goes public."
publishedAt: 2026-10-19T08:15
stars: kofi-builds
cover: covers/22-go-live-checklist-kampala.jpg
---

I am new here, so a quick hello. I build small web apps in Kampala. Last month I launched a ticketing site for a local music event, with mobile money payments. It sold 600 tickets in two days, and I made three mistakes on day one that I could have avoided.

This is the checklist I wrote afterwards. It is short on purpose.

## Switch to live credentials and test with a real small payment

My sandbox keys were still in an environment file on the server for the first hour. People paid, and nothing was recorded. Before launch, I now pay a real 500 shillings myself, from my own phone, and watch it travel through the whole system.

## Check the callback address from the outside

My callback URL worked from my laptop and was blocked by the server firewall for everyone else. I now test it from a different network, with a phone on mobile data, and I look at the server logs while I do.

## Plan what happens to a pending payment

Some payments stay pending for several minutes. I had no screen for that, so people paid twice. Now the buyer sees a clear message saying that the payment is being confirmed, with a button to check again, and the ticket is only issued once the payment is confirmed.

## Keep a way to fix things by hand

On the first evening I had to issue 14 tickets manually to people who had paid but whose payment had not been matched. I did it with raw SQL at midnight, which I do not recommend. A tiny admin page that marks an order as paid would have saved me an hour.

## Tell people who to contact

A phone number and a WhatsApp link on the payment page. Most of the problems that evening were solved in two minutes once buyers could reach me.

If you have items to add, please share them in the comments, I will update the list.

@@ author=kofi-builds at=2026-10-19T10:30 likes=grace-ug @@
Good list. The real small payment from your own phone is the one I never skip. Welcome to the platform, Grace.

@@ author=chidi-eth at=2026-10-19T15:45 @@
I would add one thing, an alert that tells you when no payment has come in for an hour during an event. Silence is often the first sign of a broken callback.
