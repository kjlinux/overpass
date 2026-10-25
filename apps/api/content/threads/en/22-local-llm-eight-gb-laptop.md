---
title: "Is a local coding model realistic on an 8 GB laptop?"
topic: tools-ai
language: en
author: emeka-dev
at: 2026-10-05T20:20
country: NG
stack: nodejs
---

Hi all,

My internet is expensive and slow, and I would like to try an AI coding assistant that runs on my laptop. It has 8 GB of memory, no dedicated graphics card, and a mid-range processor.

Is this realistic or will it freeze my machine? Which model size should I try first, and what should I expect it to do well?

@@ author=grace-ug at=2026-10-05T21:10 useful=emeka-dev,kofi-builds accepted @@
It is realistic with small expectations. On 8 GB, stay with models around 1 to 3 billion parameters in 4-bit quantisation, and close your browser tabs first. They handle autocompletion, short functions and explaining an error message. They are weak at reasoning across several files.

Start with a tool that exposes a local server and check the memory use in your task manager during the first answer.

@@ author=esi-gh at=2026-10-08T18:45 useful=emeka-dev @@
I tried this on a similar machine. Good for regex and shell commands, poor for architecture questions. I ended up using the local model offline and a hosted one only for hard problems.
