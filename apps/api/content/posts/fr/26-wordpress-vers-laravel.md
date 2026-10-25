---
title: "Migrer une boutique WordPress vers Laravel sans perdre une commande"
kind: member
author: ines-kouassi
category: tutorials
language: fr
group: member-ines-wordpress-laravel
summary: "Une boutique de pagnes en ligne, 3 200 produits, quatre ans d'historique de commandes et un plugin de paiement abandonné par son auteur. Voici le plan de migration, étape par étape, et ce qui a failli casser."
publishedAt: 2026-09-18T20:10
stars: serge-tech, kofi-builds, fatou-diallo, yao-dev, aminata-codes, chidi-eth, moussa-bf, awa-kone, ndeye-fall, kwame-dev, adjoa-tg
cover: covers/26-wordpress-vers-laravel.jpg
---

Ma cliente vend des pagnes et des accessoires depuis Abidjan, sur un WordPress avec WooCommerce. Tout marchait jusqu'au jour où le plugin qui connectait son site au mobile money a cessé d'être maintenu. Plus de mise à jour, une faille signalée, et une page de paiement qui échouait une fois sur dix.

Elle m'a demandé de refaire le site. Je ne voulais pas qu'un seul client perde une commande pendant le changement, alors j'ai préparé un plan.

## Étape 1, inventorier ce qui existe

Avant d'écrire du code, j'ai listé tout ce que le site faisait réellement. Produits avec variantes de taille et de couleur, codes promo, frais de livraison par quartier, e-mails de confirmation, factures PDF, et trois petites pages éditoriales.

Cette liste a fait disparaître la moitié du travail. Deux plugins installés ne servaient plus à rien, et un autre faisait quelque chose que Laravel gère nativement.

## Étape 2, exporter proprement

Les données de WooCommerce sont dans des tables WordPress qui mélangent les types. J'ai écrit un script d'export qui lit les produits, les clients et les commandes, et les écrit dans des fichiers CSV propres, un par entité.

Les pièges classiques m'ont tous attrapée. Des prix stockés comme du texte avec une virgule. Des produits supprimés mais encore référencés dans d'anciennes commandes. Des clients avec le même e-mail en majuscules et en minuscules.

J'ai conservé l'identifiant WordPress de chaque produit dans une colonne `legacy_id`. Il m'a servi à relier les commandes aux produits, puis à vérifier le travail.

## Étape 3, importer avec des vérifications

Un seul command artisan, `import:legacy`, relit les CSV et remplit la nouvelle base. Il peut tourner dix fois de suite sans rien dupliquer, car chaque ligne est identifiée par son `legacy_id`.

À la fin, il imprime des totaux. Nombre de produits, de clients, de commandes, et la somme de tous les montants. Je comparais ces chiffres à ceux de WooCommerce. Quand ils ne collaient pas, je cherchais avant de continuer.

## Étape 4, garder les anciennes adresses

Le site avait de bonnes positions dans les moteurs de recherche. J'ai donc recréé les adresses des produits à l'identique quand c'était possible, et pour les autres j'ai écrit une table de redirections permanentes. Un middleware lit cette table et renvoie un 301.

Sans cela, les liens partagés sur WhatsApp et sur Facebook, qui sont l'essentiel du trafic de ma cliente, auraient tous mené à des erreurs.

## Étape 5, les paiements

C'était le but de la migration. J'ai branché Wave et Orange Money avec une table de paiements, un webhook qui enregistre les événements avant de les traiter, et une tâche qui vérifie les paiements en attente depuis plus de cinq minutes. Le taux d'échec est passé de 10 % à un peu moins de 1 %.

## Étape 6, le jour du basculement

J'ai choisi un lundi matin, la période la plus calme pour une boutique de mode. Le vendredi précédent, j'ai gelé les modifications de produits sur l'ancien site. Le dimanche soir, j'ai relancé l'import complet, puis je me suis déplacée au DNS.

Pendant les premières 48 heures, j'ai gardé l'ancien site en ligne, en lecture seule, sur une adresse secondaire. Une cliente cherchait une commande vieille de trois ans, et je lui ai donné le lien. Sans cette précaution, j'aurais dû fouiller des sauvegardes.

## Ce que j'ai failli rater

Les numéros de commande. WooCommerce les numérote à partir de 1, et ma nouvelle base utilisait des identifiants différents. Les clientes avaient leur numéro dans des SMS et des e-mails, et elles écrivaient « commande 2841 » pour demander de l'aide. J'ai ajouté une colonne `public_number` qui reprend les anciens numéros et continue la suite.

## Bilan

Le travail a pris six semaines, à temps partiel. Le site charge deux fois plus vite, la cliente ne dépend plus d'un plugin abandonné, et aucune commande n'a été perdue. Le meilleur investissement a été le script de comparaison des totaux, que je garde pour les prochaines migrations.

@@ author=aminata-codes at=2026-09-18T21:30 likes=fatou-diallo,moussa-bf @@
Le coup de garder l'ancien site en lecture seule 48 heures, je le note. Tu as migré aussi les avis clients ou tu les as laissés de côté ?

@@ author=ines-kouassi at=2026-09-19T08:05 likes=aminata-codes @@
Je les ai migrés, mais comme des lignes simples sans lien vers l'utilisateur. Ma cliente n'en avait que 80, ce n'était pas la peine de faire plus compliqué.

@@ author=cheikh-sn at=2026-09-19T10:20 @@
Bravo pour la rigueur. Le total de contrôle à la fin de l'import devrait être obligatoire sur n'importe quel projet de données.

@@ author=olu-codes at=2026-09-19T15:42 likes=kwame-dev,tunde-ng @@
Very practical. The redirect table for WhatsApp links is something people forget, and in West Africa that is where the traffic really comes from.

@@ author=ndeye-fall at=2026-09-20T09:11 @@
Merci, ça m'a sauvé pour la migration que je prépare. Combien de temps a pris l'import complet pour 3 200 produits ?

@@ author=ines-kouassi at=2026-09-20T11:40 likes=ndeye-fall,adjoa-tg @@
Environ quatre minutes, avec les images. Sans les images, moins de trente secondes. Je les copie à part avec rsync, c'est beaucoup plus rapide que de les traiter dans le script.
