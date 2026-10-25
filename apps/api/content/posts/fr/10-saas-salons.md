---
title: "Bonjour à tous, je vous présente mon SaaS pour les salons de coiffure"
kind: member
author: aminata-codes
category: portraits
language: fr
group: member-saas-salons
cover: covers/10-saas-salons.jpg
summary: "Huit mois de travail le soir et le week-end, vingt-trois salons clients à Dakar. Je vous déballe tout, point par point : le problème, la stack, les prix, les erreurs."
publishedAt: 2026-10-24T08:30
stars: serge-tech, yao-dev, awa-kone, fatou-diallo, moussa-bf, kofi-builds, ndeye-fall, adjoa-tg, ines-kouassi, boubacar-ml, cheikh-sn, mariama-gn, rokia-traore, fanta-ci, paul-cm, lamine-sn, dieudonne-bj, estelle-cm, jean-marc-ci, mahamadou-ne, ama-mensah, kwame-dev, olu-codes, chidi-eth, tunde-ng, esi-gh, grace-ug
---

Bonjour à tous,

Aujourd'hui je vais vous présenter mon projet, un SaaS de réservation pour les salons de coiffure et d'esthétique à Dakar. Je vais tout déballer ici, point par point, parce que j'aurais aimé lire ce genre de billet quand j'ai commencé.

## 1. Le problème

Ma sœur tient un salon aux Parcelles Assainies. Ses rendez-vous, c'était un cahier, des vocaux WhatsApp et beaucoup de clientes qui ne venaient pas. Elle perdait facilement deux ou trois créneaux par jour.

## 2. Ce que fait l'appli

- Les clientes réservent depuis un lien, sans installer d'application.
- Un acompte se paie par Wave ou Orange Money au moment de la réservation.
- Un rappel part la veille par SMS.
- La gérante voit sa journée sur son téléphone.

Rien de révolutionnaire. Mais l'acompte a divisé les absences par quatre chez ma sœur, et c'est ça qui fait vendre.

## 3. La stack

Laravel, Vue, PostgreSQL, un petit VPS. Les paiements passent par Wave et Orange Money, les SMS par un agrégateur local. J'ai volontairement choisi des outils que je connais par cœur : je voulais livrer, pas apprendre.

## 4. Les prix

- 7 500 F CFA par mois pour un salon jusqu'à 3 employées.
- 15 000 F CFA au-delà.
- Premier mois offert.

J'ai commencé à 5 000, c'était trop bas : le coût des SMS mangeait presque tout.

## 5. Les chiffres

Vingt-trois salons payants, dont dix-neuf à Dakar et quatre à Thiès. Environ 1 100 réservations par mois. Je ne me paie pas encore de salaire, mais les serveurs et les SMS sont couverts depuis septembre.

## 6. Mes erreurs

- J'ai passé deux mois sur un tableau de bord statistique que personne n'ouvre.
- J'ai sous-estimé le support : les gérantes m'appellent, elles n'écrivent pas.
- J'ai intégré le premier opérateur de paiement sans lire les pièges. Je vous raconterai ça dans un fil, il y a de quoi dire.

## 7. La suite

Une version pour les barbiers (beaucoup m'en ont demandé), et peut-être Abidjan l'année prochaine.

Si vous avez des questions, posez-les en commentaire, je réponds à tout.

@@ author=awa-kone at=2026-10-24T09:12 likes=serge-tech,yao-dev,fatou-diallo,moussa-bf,ndeye-fall @@
Merci pour la transparence sur les prix et les erreurs, c'est rare. Le point sur le tableau de bord que personne n'ouvre m'a fait rire, je l'ai fait aussi sur un projet.

@@ author=yao-dev at=2026-10-24T10:40 likes=awa-kone,ines-kouassi @@
Question bête : l'acompte, tu le reverses au salon tout de suite ou tu le gardes jusqu'au rendez-vous ?

@@ author=aminata-codes at=2026-10-24T11:05 likes=yao-dev,serge-tech,fatou-diallo,moussa-bf,ndeye-fall,adjoa-tg,boubacar-ml @@
Pas bête du tout. L'argent va directement sur le compte marchand du salon, je ne le touche jamais. C'était important pour la confiance, et ça m'évite d'être considérée comme un établissement de paiement.

@@ author=kofi-builds at=2026-10-24T14:22 likes=aminata-codes,chidi-eth,awa-kone @@
Love this. The SMS reminder plus deposit combo works the same way in Accra, I have seen it with barbers. If you ever go to Ghana, ping me.

@@ author=ines-kouassi at=2026-10-24T16:30 likes=aminata-codes,ndeye-fall,cheikh-sn @@
Merci pour ce billet. Tu as pris quel agrégateur pour les SMS ? J'ai testé deux offres à Abidjan et le délai de livraison variait beaucoup d'un opérateur à l'autre.

@@ author=aminata-codes at=2026-10-24T17:10 likes=ines-kouassi @@
Un agrégateur local avec des routes directes vers Orange et Free. Je te dirai le nom par message, je préfère ne pas faire de pub ici. Le conseil : teste l'envoi un samedi soir, c'est là que ça coince.

@@ author=cheikh-sn at=2026-10-24T20:15 likes=aminata-codes,paul-cm,lamine-sn,mariama-gn,fanta-ci @@
La version barbiers, je la veux ! Chez nous à Saint-Louis, tous les barbiers que je connais travaillent sur WhatsApp et se plaignent des rendez-vous manqués.

@@ author=aminata-codes at=2026-10-25T07:40 likes=cheikh-sn,rokia-traore @@
Noté, Cheikh. Je cherche deux barbiers pour tester en novembre, écris-moi si tu veux en proposer.

@@ author=olu-codes at=2026-10-25T09:20 likes=kofi-builds,kwame-dev,tunde-ng,ama-mensah @@
Great write-up. The part about SMS costs eating the margin at 5,000 is useful, I made the same pricing mistake on a booking tool in Lagos.
