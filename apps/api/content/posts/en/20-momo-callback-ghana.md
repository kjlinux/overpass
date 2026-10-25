---
title: "The MoMo callback bug that cost us three days in Accra"
kind: member
author: ama-mensah
category: tutorials
language: en
group: member-ama-callback-bug
summary: "Payments went through, money moved, and our app still said pending. The cause was a trailing slash, a proxy and a handler that returned a redirect. A short debugging story with the fix."
publishedAt: 2026-08-27T16:35
stars: serge-tech, kofi-builds, fatou-diallo, aminata-codes, chidi-eth, moussa-bf, awa-kone, ndeye-fall, kwame-dev
cover: covers/20-momo-callback-ghana.jpg
---

Three days. That is how long it took me and a teammate to find a bug that was one character long. I am writing it down so nobody else has to spend those days.

## The symptom

We run an online ordering service for small restaurants in Accra. Customers pay with mobile money, and the provider confirms each payment by calling a callback URL on our server.

One Monday, about a third of the payments stayed pending. The money had left the customers' wallets, restaurant owners were calling us, and our logs showed nothing. Not an error, not a request. As if the callback never existed.

## The wrong turns

We blamed the provider first. We opened a support ticket and were told that callbacks were being sent and answered with a success status on their side. That made no sense, because our server had not seen them.

Then we blamed our firewall. We checked the rules, whitelisted the provider's addresses and found nothing odd. Then we blamed our hosting, and spent half a day reading about a network incident that had nothing to do with us.

## The actual cause

In the callback URL we had registered in the provider's dashboard, there was no trailing slash. Our app, behind an Nginx proxy, had a rule that redirected any path without a trailing slash to the same path with one, using a 301.

Most of the time the provider followed redirects, and everything worked. But the provider's system treats a 301 as a final answer for a POST request. Our server answered with a redirect, they logged it as a delivered callback with a response code in the 2xx and 3xx range, and they stopped.

Why only a third of payments? A recent change on our side had turned the redirect on for one of two servers behind the load balancer. Half of the callbacks reached the good one, and the rest got a redirect.

## How we found it

Late on Wednesday, I replayed a callback by hand with curl against each server.

```bash
curl -i -X POST https://api.example.com/callbacks/momo \
  -H "Content-Type: application/json" \
  -d '{"id":"test"}'
```

One server answered 200. The other answered 301 with a `Location` header. We had been testing only the first one.

## The fix

We did three things. We removed the redirect rule for the callback path, so a POST is answered directly. We registered the exact URL with the slash in the dashboard, to be safe. And we made both servers use the same configuration file from the same repository, which should have been the case from the start.

We also wrote a small script that replays the last 50 callbacks from the provider's dashboard, to fix the pending payments. All the orders were corrected within an hour.

## What I keep from this

Callback endpoints must never redirect. They must answer a POST directly, with a status in the 200 range, as fast as possible.

When something does not reach you, test every machine that could receive it, one by one, with the same command. I had assumed our two servers were identical, and they were not.

And always log the raw requests that reach the proxy, not only the ones that reach the app. If we had done that from day one, we would have seen the 301 in five minutes.

@@ author=kofi-builds at=2026-08-27T18:05 likes=chidi-eth,kwame-dev,awa-kone @@
Painful and very relatable. I lost a day once to a trailing slash too. Thanks for writing it up so clearly, Ama.

@@ author=serge-tech at=2026-08-27T20:40 likes=fatou-diallo,aminata-codes,moussa-bf,ndeye-fall,kofi-builds,kwame-dev,chidi-eth @@
Les redirections sur un endpoint de webhook, c'est un classique. Je le mets dans ma liste de vérifications avant livraison. Et bien vu pour le journal au niveau du proxy.

@@ author=kwame-dev at=2026-08-28T08:15 @@
Did you consider putting the callback behind a separate hostname with its own minimal proxy config? We did that and it removed this whole class of surprises.

@@ author=ama-mensah at=2026-08-28T10:50 likes=kwame-dev,serge-tech @@
Not yet, but that is on our list after this week. A dedicated hostname for callbacks only makes sense, nothing else lives there to break it.

@@ author=chidi-eth at=2026-08-28T14:22 @@
Great debugging story. How did you replay the callbacks from the dashboard, was there an export or did you do it by hand?
