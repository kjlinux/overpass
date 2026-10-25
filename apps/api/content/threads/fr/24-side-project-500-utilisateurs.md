---
title: "Mon side project a 500 utilisateurs et il plante en erreur 500"
topic: projects
language: fr
author: cheikh-sn
at: 2026-09-27T16:10
country: SN
stack: django
---

Bonjour,

J'ai lancé le mois dernier une petite application de suivi de dépenses pour étudiants, avec Django et SQLite sur un VPS. Elle a atteint 500 inscrits cette semaine, ce qui me fait très plaisir.

Mais depuis deux jours j'ai des erreurs 500 par moments, surtout le soir, avec le message `database is locked` dans les journaux.

Je ne pensais pas devoir me soucier de ça à ce stade. Que faire en premier ?

@@ author=serge-tech at=2026-09-27T16:45 useful=cheikh-sn,aminata-codes,fatou-diallo,moussa-bf accepted @@
Félicitations, et c'est un bon problème. SQLite verrouille toute la base pendant une écriture, et avec plusieurs utilisateurs le soir tu atteins cette limite.

Passe à PostgreSQL, Django rend la migration simple avec `dumpdata` puis `loaddata`. Si tu ne peux pas tout de suite, active le mode WAL et augmente le `timeout` des connexions pour gagner quelques semaines.

@@ author=aminata-codes at=2026-09-27T18:20 useful=cheikh-sn @@
Fais une sauvegarde de `db.sqlite3` avant toute migration. Je le dis parce que la plupart des gens l'oublient.

@@ author=mariama-gn at=2026-09-28T09:05 @@
Pense aussi à mesurer. Un petit outil de suivi des erreurs gratuit te dira quelles pages plantent, au lieu de lire les journaux à la main.

@@ author=cheikh-sn at=2026-09-29T21:30 useful=serge-tech @@
Migré vers PostgreSQL ce week-end, avec le dump testé sur une copie d'abord. Plus aucune erreur depuis.
