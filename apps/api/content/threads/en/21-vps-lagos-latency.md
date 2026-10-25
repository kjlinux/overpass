---
title: "Serving users in Lagos: European VPS, local datacentre or serverless?"
topic: cloud
language: en
author: olu-codes
at: 2026-09-18T22:10
country: NG
stack: python
---

Hello,

My API sits on a VPS in Frankfurt and my users are mostly in Lagos and Abuja. Pages that need three or four API calls feel slow, around 600 ms per call on mobile data.

I am thinking of moving to a datacentre in Lagos, or to a serverless platform with edge locations. Has anyone measured the difference? I do not want to move everything and discover nothing improved.

@@ author=chidi-eth at=2026-09-18T22:50 useful=olu-codes,kofi-builds @@
Measure before moving. Run a simple script from a Lagos connection that times DNS, connection and first byte separately. In my case most of the 600 ms was the TLS handshake plus four sequential calls, not distance alone.

@@ author=kofi-builds at=2026-09-19T08:30 useful=olu-codes @@
I made the same kind of move from Europe to a local host. Latency fell by about 150 ms per call, but the host had two outages in three months, so I put a cache in front and kept the old server as a fallback.

@@ author=tunde-ng at=2026-09-19T12:05 useful=olu-codes,chidi-eth,kofi-builds @@
Before moving anything, cut the number of calls. One endpoint that returns what the screen needs beats four endpoints on a faster server. Then put a CDN in front for anything cacheable, and keep the VPS where it is.
