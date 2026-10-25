---
title: "Flutter app janky on cheap Android phones with 2 GB of RAM"
topic: projects
language: en
author: tunde-ng
at: 2026-09-27T15:30
country: NG
stack: flutter
---

Hi everyone,

I am building a small savings group app in Flutter. On my own phone it is smooth, but testers with cheap Android phones (2 GB of RAM, old Android versions) report stutter when scrolling the transaction list and sometimes the app closes on its own.

I have no idea where to start. Should I test on a real cheap phone, use the profiler, or rewrite the list?

@@ author=kofi-builds at=2026-09-27T16:10 useful=tunde-ng,chidi-eth @@
Buy or borrow one of those phones and make it your main test device. Nothing replaces it. Then run the app in profile mode, never debug mode, because debug mode is much slower than what your users get.

@@ author=olu-codes at=2026-09-28T09:40 useful=tunde-ng @@
Check the list first. If you build every row at once instead of using `ListView.builder`, memory goes up quickly. Also resize images before showing them, a full-size photo in an avatar is a classic crash.

@@ author=grace-ug at=2026-10-03T19:25 useful=tunde-ng,olu-codes @@
Same experience here. We also dropped some animations on low-memory devices, nobody missed them.
