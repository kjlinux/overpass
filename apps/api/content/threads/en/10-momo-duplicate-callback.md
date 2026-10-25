---
title: "MTN MoMo callback hits my server twice, how do you dedupe?"
topic: integrations
language: en
author: kofi-builds
at: 2026-10-24T10:05
country: GH
stack: nodejs
---

Hey all,

Building a delivery app in Kumasi, Node.js + Express backend. Customers pay with MTN MoMo through the Collection API, and I mark the order as paid in the callback.

Problem: about one order in ten gets the callback twice, sometimes 30 seconds apart. Right now that means the rider gets two notifications and my accounting shows the payment twice.

How do you handle this? Lock? Check before insert? Something else?

@@ author=chidi-eth at=2026-10-24T10:38 useful=kofi-builds,serge-tech,fatou-diallo accepted @@
Treat every callback as "this might be the second time". The cleanest way:

- Store payments with a unique constraint on the reference you sent in `X-Reference-Id`.
- In the callback, insert the payment row and let the database refuse the duplicate. If it was refused, you already processed it: return 200 and stop.

```js
const result = await db.query(
  `insert into payments (reference, status) values ($1, $2)
   on conflict (reference) do nothing returning id`,
  [reference, status],
);
if (result.rowCount === 0) return res.sendStatus(200);
```

A "check then insert" in code has a race: two callbacks 30 ms apart both see nothing and both insert.

@@ author=serge-tech at=2026-10-24T11:10 useful=kofi-builds @@
Plus one to Chidi. Also answer 200 fast and do the slow work (notifications, accounting) after. Providers usually retry when your endpoint is slow or times out, and that is probably where your duplicates come from.

@@ author=kofi-builds at=2026-10-24T13:44 @@
Added the unique constraint and moved notifications to a queue. Zero duplicates since. Thanks both, this community is already paying off.
