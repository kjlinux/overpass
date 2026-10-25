---
title: "Une appli Kotlin pour les commerçants du marché de Madina, à Conakry"
kind: member
author: mariama-gn
category: portraits
language: fr
group: member-mariama-madina
summary: "Un carnet de dettes, un téléphone Android à 400 000 francs guinéens et une connexion qui disparaît. Comment j'ai construit une appli hors ligne pour des commerçantes qui ne lisaient pas un mot d'anglais."
publishedAt: 2026-10-02T18:30
stars: serge-tech, kofi-builds, fatou-diallo, yao-dev, aminata-codes, chidi-eth, moussa-bf, awa-kone
cover: covers/25-kotlin-commercants-conakry.jpg
---

Ma tante vend des tissus au marché de Madina depuis trente ans. Elle a un carnet pour les clientes qui achètent à crédit, un autre pour les fournisseurs, et une mémoire que personne ne peut copier. Quand j'ai fini mes études d'informatique, c'est la première chose qu'elle m'a demandée, « tu peux faire quelque chose pour mes carnets ? ».

## Ce que j'ai écrit

Une application Android en Kotlin, avec Jetpack Compose pour l'interface et Room pour la base locale. Elle fait peu de choses. On ajoute une cliente, on note une vente à crédit, on note un remboursement, et l'écran d'accueil montre qui doit combien.

Elle fonctionne entièrement sans réseau. La synchronisation avec le serveur se fait quand le téléphone retrouve de la connexion, en arrière-plan, avec WorkManager.

## Pourquoi hors ligne d'abord

Au marché, le réseau va et vient avec la foule et la météo. Une application qui attend le serveur pour enregistrer une vente est inutilisable. Chaque écriture va donc d'abord dans Room, avec un indicateur « à envoyer », puis part au serveur dès que possible.

Pour les conflits, j'ai choisi la règle la plus simple. Une vente est un événement qu'on ajoute, jamais une ligne qu'on modifie. Deux téléphones qui notent des ventes différentes ne se contredisent donc jamais, leurs listes s'additionnent.

## Les rappels par SMS

Une commerçante n'aime pas relancer une cliente en face à face. L'application propose un bouton qui envoie un SMS poli, rédigé à l'avance, au numéro de la cliente. J'ai passé plus de temps sur ce texte que sur certains écrans.

Pour que la cliente règle directement, le message contient le numéro de mobile money de la commerçante. Le paiement se fait hors de l'application, et la commerçante note le remboursement ensuite. Je n'ai pas voulu intégrer un paiement dans l'appli pour l'instant, parce que les marges de ces ventes sont trop petites pour supporter des frais.

## L'interface pour des gens qui ne lisent pas beaucoup

J'ai remplacé la plupart des textes par des icônes et des couleurs. Le rouge pour une dette, le vert pour un remboursement. Les montants sont écrits en gros chiffres avec des espaces tous les trois, comme on les lit à voix haute.

J'ai aussi enregistré des messages vocaux courts pour les écrans d'aide, en soussou et en français. Ce sont les écrans qu'on ouvre le plus souvent les premiers jours.

## Ce qui a mal tourné

Mon premier prototype utilisait une grosse bibliothèque de graphiques pour montrer l'évolution des dettes. Elle faisait passer l'appli de 8 à 31 Mo. Sur le téléphone d'une commerçante avec 12 Go de stockage presque plein, elle ne s'installait pas. J'ai tout retiré et gardé un simple total.

J'ai aussi oublié que certains téléphones tuent les tâches en arrière-plan pour économiser la batterie. La synchronisation ne partait jamais chez deux utilisatrices. J'ai ajouté une explication dans l'appli, avec des captures, pour désactiver l'optimisation de batterie, et un bouton de synchronisation manuelle.

## Où j'en suis

Douze commerçantes l'utilisent, toutes autour de ma tante. Aucune ne paie encore. Je veux d'abord voir si elles l'ouvrent encore dans trois mois. Si oui, je réfléchirai à un abonnement très bas, ou à une commission sur les paiements.

Si l'un d'entre vous a déjà fait de la synchronisation hors ligne en Kotlin, je prends volontiers des conseils en commentaire.

@@ author=awa-kone at=2026-10-02T19:40 likes=aminata-codes,fatou-diallo,serge-tech @@
Très beau projet. Les événements qu'on ajoute au lieu des lignes qu'on modifie, c'est exactement ce qui t'évite les pires conflits. Bravo.

@@ author=chidi-eth at=2026-10-03T08:05 @@
Which sync strategy did you pick for the retries, fixed delay or exponential backoff? On unstable networks the second one saved us a lot of battery.

@@ author=mariama-gn at=2026-10-03T10:30 likes=chidi-eth @@
Exponential backoff, avec un plafond à 30 minutes. WorkManager le gère presque tout seul, il suffit de lui dire à quelles conditions réessayer.

@@ author=yao-dev at=2026-10-03T12:12 likes=kofi-builds @@
Le point sur le poids de l'appli, j'en ai fait les frais aussi. 8 Mo, c'est un vrai argument de vente dans nos marchés.

@@ author=kofi-builds at=2026-10-04T07:50 likes=mariama-gn,awa-kone,moussa-bf,chidi-eth,serge-tech,fatou-diallo @@
This is the kind of post that makes me proud to be on this platform. A debt notebook is a real problem and you solved it properly. Merci Mariama.
