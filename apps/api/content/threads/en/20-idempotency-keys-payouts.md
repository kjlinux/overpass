---
title: "Idempotency keys for payouts: who generates them and how long do you keep them?"
topic: integrations
language: en
author: kwame-dev
at: 2026-08-30T19:15
country: GH
stack: nodejs
---

Hi everyone,

I am building a small payout feature that sends money to mobile wallets from a Node.js backend. Last week a client's network dropped right after we sent a payout request, our code retried, and one recipient got paid twice.

I read that I should use an idempotency key but I am not sure about the details. Does my server generate the key or the client app? How long should I store them? And what do I return when the same key comes in again?

@@ author=kofi-builds at=2026-08-30T20:00 useful=kwame-dev,serge-tech @@
Generate it on the client side, once per user intention (one tap on "Send"), and reuse the same key on every retry of that intention. If the server generates it, the retry after a dropped connection gets a new key and you are back to square one.

@@ author=chidi-eth at=2026-08-31T07:45 useful=kwame-dev,kofi-builds,serge-tech,fatou-diallo,aminata-codes accepted @@
To answer your three questions in order. The client generates a UUID per payout. You store the key with the request fingerprint and the response in a table with a unique constraint. If the same key comes back with the same body, return the stored response and do nothing else. If it comes back with a different body, return a 422, because that is a bug on the client side.

Keep keys for at least as long as your longest retry window, I use 24 hours for payouts.

```sql
create table idempotency_keys (
  key uuid primary key,
  request_hash text not null,
  response jsonb,
  created_at timestamptz not null default now()
);
```

@@ author=ama-mensah at=2026-08-31T12:20 useful=kwame-dev @@
Also pass the same key down to the provider if it supports one. Then even if your own table has a gap, the provider refuses the duplicate.
