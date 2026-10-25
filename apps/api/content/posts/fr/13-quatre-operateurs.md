---
title: "Quatre opérateurs de paiement en deux ans : ce que j'aurais aimé savoir"
kind: member
author: serge-tech
category: tutorials
language: fr
group: member-serge-operateurs
cover: covers/13-quatre-operateurs.jpg
summary: "Wave, Orange Money, MTN MoMo, Moov. Les leçons qui reviennent à chaque intégration, quel que soit l'opérateur, pour gagner des semaines."
publishedAt: 2026-10-23T12:05
stars: yao-dev, moussa-bf, kofi-builds, aminata-codes, fatou-diallo, chidi-eth, awa-kone, ndeye-fall, boubacar-ml, cheikh-sn, jean-marc-ci, emeka-dev, tunde-ng, dieudonne-bj, lamine-sn, olu-codes, grace-ug
---

Je développe depuis dix ans, dont les deux dernières années presque uniquement sur des intégrations de paiement pour des clients à Cotonou, Lomé et Abidjan. Voici ce qui revient à chaque fois.

## 1. Le webhook est la vérité, pas la redirection

Le client revient sur votre site après avoir payé ? Ça ne prouve rien. Il peut fermer l'onglet, perdre le réseau, ou revenir sans avoir payé. Seule la notification serveur à serveur fait foi, et seulement une fois sa signature vérifiée.

## 2. Tout arrive deux fois

Les opérateurs relancent quand votre serveur répond lentement. Mettez une contrainte d'unicité sur la référence de transaction et répondez 200 vite. Ça vaut pour tous les opérateurs, sans exception.

## 3. Signez le corps brut

Ne vérifiez jamais une signature sur un JSON que vous avez reconstruit. Prenez les octets reçus, tels quels.

## 4. Sandbox et production sont deux mondes

Identifiants différents, URL différentes, parfois des comportements différents. Une variable d'environnement oubliée, et c'est un après-midi de 401.

## 5. Les montants sont des entiers

Le franc CFA n'a pas de centimes. Stockez des entiers, jamais des nombres à virgule, et indiquez la devise à côté de chaque montant.

## 6. Notez chaque piège

Un fichier partagé, un wiki, ou une fiche ici. Le prochain développeur, c'est peut-être vous dans six mois.

Si vous débutez sur un opérateur, posez la question dans les discussions avant de chercher seul pendant trois jours. On est là pour ça.

@@ author=yao-dev at=2026-10-23T13:20 likes=serge-tech,aminata-codes,moussa-bf @@
Le point 1, personne ne me l'avait jamais dit aussi clairement. Merci Serge.

@@ author=kofi-builds at=2026-10-24T14:05 likes=serge-tech,chidi-eth,fatou-diallo,emeka-dev,tunde-ng @@
Point 2 cost me a week this year. Bookmarking this for every new dev on our team.

@@ author=fatou-diallo at=2026-10-24T16:10 likes=serge-tech,aminata-codes,yao-dev,moussa-bf,boubacar-ml,kofi-builds,awa-kone @@
J'ajouterais un 7 : prévoir dès le début le remboursement. On l'a ajouté après coup et ça a été douloureux.

@@ author=boubacar-ml at=2026-10-24T18:00 likes=serge-tech,fatou-diallo,jean-marc-ci @@
Le point 3 sur le corps brut m'a coûté une journée entière. Mon framework relisait le JSON avant que je puisse calculer la signature.

@@ author=serge-tech at=2026-10-24T19:15 likes=boubacar-ml,yao-dev,dieudonne-bj,ndeye-fall @@
Oui, c'est un classique. Il faut lire le corps avant l'analyse JSON, sinon les espaces et l'ordre des clés ne sont plus les mêmes. Et Fatou a raison, le remboursement est un bon septième point.

@@ author=emeka-dev at=2026-10-25T08:30 likes=serge-tech,kofi-builds,tunde-ng,olu-codes,grace-ug @@
Thanks for writing this in plain words. On point 5, I would add that some providers send amounts as strings. Convert them to integers once, at the edge, and never again.

@@ author=salif-bf at=2026-10-25T09:40 likes=serge-tech,boubacar-ml @@
Merci Serge. Je vais imprimer la liste pour l'équipe, elle règle déjà la moitié de nos questions de revue de code.
