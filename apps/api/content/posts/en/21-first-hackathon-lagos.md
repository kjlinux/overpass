---
title: "My first hackathon in Lagos, 36 hours and one working payment flow"
kind: member
author: tunde-ng
category: portraits
language: en
group: member-tunde-hackathon
summary: "We did not win. We did ship a working bill-splitting app with mobile payments, and I learned more in a weekend than in a year of tutorials. Here is how the team worked, what broke and what I would do again."
publishedAt: 2026-10-09T11:00
stars: serge-tech, kofi-builds, fatou-diallo, chidi-eth, awa-kone, ama-mensah, kwame-dev, olu-codes, emeka-dev, grace-ug, esi-gh, aminata-codes
cover: covers/21-first-hackathon-lagos.jpg
---

Two weeks ago I took part in my first hackathon, in Lagos. I had been coding for three years, mostly alone, and I was certain I would be the slowest person in the room. I was not, but I was not the fastest either, and that turned out to be fine.

## The team

We were four. Chiamaka, a designer who also writes front-end code. Dayo, a backend developer who had done two hackathons before. Ibrahim, a student who knew a lot about databases and almost nothing about deadlines. And me.

We met an hour before the start, in the queue for registration. Nobody had a plan. By the end of the opening talk we had agreed on one idea, an app that splits a restaurant bill between friends and collects each share by mobile money.

## Hour 0 to 6, choosing small

Dayo made us do something I would not have done myself. He asked us to write on a wall what the demo would look like in the last three minutes. Not the features, only the demo. A group creates a bill, shares a link, three friends pay, the creator sees the total turn green.

Everything that was not on that list was dropped. No accounts, no history, no receipts, no tips. It hurt at first, and it saved us.

## Hour 6 to 24, building

I took the payment flow. We used a provider's sandbox, with a simple server in Node, one endpoint to start a payment and one to receive the confirmation. I had read about webhooks, but I had never written one under pressure.

The first problem came at 2 a.m. The sandbox confirmed payments, but our page never updated. I spent two hours on it before Dayo looked over my shoulder and saw that I was returning the confirmation to the wrong route. A mistake I would have found in five minutes if I had slept.

Around 5 a.m. we slept on the floor in two-hour shifts. The organisers gave us noodles and bad coffee, and both felt like a feast.

## Hour 24 to 36, the demo

The last night was about polishing the three-minute path. We rehearsed it nine times. On the seventh, the payment confirmation took too long and the green total did not appear. We added a small loading state with a sentence saying what we were waiting for, and the demo became smoother.

We presented fifth out of twenty-two teams. The jury asked how we would make money, and none of us had thought about it. Dayo improvised something about a small fee on groups, and the jury smiled politely.

We did not win. The winners built a tool for market sellers to track stock by voice, and it was very good.

## What I learned

Scope is the whole game. A small thing that works beats a large thing that almost works, every time, and demos are won on the path, not on the features.

Working with others is a skill, and I am only beginning to learn it. I used to think asking for help was slow. In that room, it was the fastest thing I did.

Reading the documentation of a payment provider the night before the event was the best preparation I could have made. If you are planning to join one, do that, and keep a working sandbox account ready.

## Would I do it again

Yes, in a heartbeat. I am already looking at one in Abuja next month. If someone here wants to form a team, write to me.

@@ author=olu-codes at=2026-10-09T12:20 likes=kwame-dev,emeka-dev @@
The wall with the three-minute demo is a brilliant trick. I am stealing it for our next sprint planning.

@@ author=kofi-builds at=2026-10-09T14:05 likes=tunde-ng,chidi-eth,ama-mensah,grace-ug,esi-gh,kwame-dev,olu-codes @@
Congratulations on shipping. Fifth out of twenty-two on a first attempt is a great result. Tell me when you do Abuja, I might fly in.

@@ author=emeka-dev at=2026-10-09T16:40 @@
Was the sandbox stable during the weekend? We had a hackathon in Enugu where the provider's test environment went down twice.

@@ author=tunde-ng at=2026-10-09T18:12 likes=emeka-dev @@
It held, but slowly at night. We cached the last successful response in our demo as a safety net, just in case. I would recommend that to everyone.

@@ author=serge-tech at=2026-10-10T08:30 likes=fatou-diallo,aminata-codes @@
Bravo Tunde. Le plus important dans ton billet, c'est le passage sur le scope. Les gens perdent les hackathons en voulant tout montrer.

@@ author=dieudonne-bj at=2026-10-11T09:15 @@
Merci pour ce récit, ça donne envie. Existe-t-il un événement équivalent à Cotonou ? Je cherche une équipe.

@@ author=esi-gh at=2026-10-11T13:40 @@
Not Tunde, but I know of one at the end of November in Accra. I will post the link in the forum.
