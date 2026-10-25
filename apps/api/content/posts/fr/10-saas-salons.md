---
title: "Bonjour à tous, je vous présente mon SaaS pour les salons de coiffure"
kind: member
author: aminata-codes
category: portraits
language: fr
group: member-saas-salons
summary: "Huit mois de travail le soir et le week-end, vingt-trois salons clients à Dakar. Je vous déballe tout, point par point : le problème, la stack, les prix, les erreurs."
publishedAt: 2026-10-24T08:30
stars: serge-tech, yao-dev, awa-kone, fatou-diallo, moussa-bf, kofi-builds
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

@@ author=awa-kone at=2026-10-24T09:12 @@
Merci pour la transparence sur les prix et les erreurs, c'est rare. Le point sur le tableau de bord que personne n'ouvre m'a fait rire, je l'ai fait aussi sur un projet.

@@ author=yao-dev at=2026-10-24T10:40 @@
Question bête : l'acompte, tu le reverses au salon tout de suite ou tu le gardes jusqu'au rendez-vous ?

@@ author=aminata-codes at=2026-10-24T11:05 @@
Pas bête du tout. L'argent va directement sur le compte marchand du salon, je ne le touche jamais. C'était important pour la confiance, et ça m'évite d'être considérée comme un établissement de paiement.

@@ author=kofi-builds at=2026-10-24T14:22 @@
Love this. The SMS reminder plus deposit combo works the same way in Accra, I have seen it with barbers. If you ever go to Ghana, ping me.
