---
title: "Notre plateforme de frais de scolarité a une semaine : les vrais chiffres"
kind: member
author: fatou-diallo
category: portraits
language: fr
group: member-fatou-scolarite
summary: "Trois écoles pilotes à Dakar, 212 paiements, deux pannes et beaucoup d'appels de parents. Ce qu'on a appris pendant la première semaine."
publishedAt: 2026-10-25T08:10
stars: aminata-codes, serge-tech, awa-kone
---

Il y a une semaine, on a ouvert notre plateforme de paiement des frais de scolarité à trois écoles privées de Dakar. On est deux, un développeur (moi) et une associée qui s'occupe des écoles. Voici les chiffres, sans filtre.

## Les chiffres

- 212 paiements réussis, pour environ 9,4 millions de F CFA.
- 31 paiements abandonnés en cours de route.
- 2 pannes : une de 40 minutes (notre faute, une migration), une de 2 heures (chez un opérateur).
- 57 appels de parents, dont la moitié pour demander si le paiement était bien passé.

## Ce qu'on a appris

**Les parents veulent une preuve.** Un reçu par SMS avec le nom de l'élève et le montant a fait tomber les appels de moitié dès le troisième jour.

**L'école veut un fichier.** Les comptables ne se connectent pas au tableau de bord. Ils veulent un export à la fin de la journée, dans le format de leur logiciel.

**Les abandons ont presque tous la même cause.** Le parent ne voit pas la demande de confirmation sur son téléphone, attend, puis abandonne. On ajoute un message qui explique quoi faire pendant l'attente.

## La question de l'hébergement

J'ai posé la question ici, et les réponses m'ont fait gagner du temps. On garde notre serveur actuel, on allège les pages et on met les fichiers derrière un CDN. On reparlera de la localisation des données avec les écoles en décembre.

## La suite

Deux nouvelles écoles en novembre, et Thiès en janvier si tout va bien.

@@ author=awa-kone at=2026-10-25T08:45 @@
Le reçu avec le nom de l'élève, quelle bonne idée. C'est le genre de détail qu'aucune maquette ne fait apparaître, il faut des vrais parents.

@@ author=serge-tech at=2026-10-25T09:05 @@
Bravo pour la transparence sur les pannes. Une migration en journée, on l'a tous fait une fois. La deuxième fois, on la fait à 2 h du matin.
