---
title: "Sauvegardes PostgreSQL sur un petit VPS : vous faites comment ?"
topic: cloud
language: fr
author: aminata-codes
at: 2026-07-19T20:40
country: SN
stack: django
---

Bonsoir à tous,

J'ai deux clients qui tournent sur un VPS à 5 000 FCFA par mois avec PostgreSQL installé directement dessus. Pour l'instant, ma sauvegarde est un `pg_dump` lancé par cron chaque nuit et copié dans un autre dossier du même serveur.

Je sais que c'est faible : si le disque meurt, tout part. Mais je ne veux pas payer un stockage cher pour de petites bases.

Qu'est-ce que vous utilisez, et est-ce que vous testez vraiment la restauration ?

@@ author=serge-tech at=2026-07-19T21:20 useful=aminata-codes,fatou-diallo,yao-dev @@
Le dossier sur le même serveur n'est pas une sauvegarde. Envoie le dump chiffré vers un stockage compatible S3 hors du serveur, il y en a des très économiques, et garde les 7 derniers jours plus un par mois.

Et oui, teste la restauration. Chaque premier dimanche du mois je restaure le dernier dump dans une base vide et je compte les lignes de deux tables.

@@ author=fatou-diallo at=2026-07-19T22:05 useful=aminata-codes @@
Chiffre le dump avant l'envoi, avec `age` par exemple. Ce sont des données de clients, même petites.

@@ author=moussa-bf at=2026-07-23T08:45 useful=aminata-codes,serge-tech @@
Je fais `pg_dump -Fc` plutôt que du SQL brut, le fichier est plus petit et `pg_restore` permet de ne récupérer qu'une table quand un client supprime une donnée par erreur. Ça m'est arrivé deux fois.

@@ author=aminata-codes at=2026-07-23T19:10 @@
Je commence par le chiffrement et l'envoi externe cette semaine, merci à tous.
