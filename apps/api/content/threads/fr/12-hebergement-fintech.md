---
title: "Héberger une fintech à Dakar : VPS local ou cloud européen ?"
topic: cloud
language: fr
author: fatou-diallo
at: 2026-10-24T12:30
country: SN
stack: django
---

Bonjour la communauté,

On lance une plateforme de paiement des frais de scolarité (Django, PostgreSQL, un worker Celery). Aujourd'hui tout tourne sur un serveur en Europe, pas cher et fiable.

Deux questions reviennent avec nos premiers partenaires :

- la latence pour les parents qui paient depuis un téléphone en 3G à Kaolack ou Ziguinchor ;
- la question des données : certains établissements demandent où sont stockées les informations des élèves.

Est-ce que certains d'entre vous hébergent en Afrique de l'Ouest ? Retours d'expérience bienvenus, même négatifs.

@@ author=serge-tech at=2026-10-24T13:02 useful=fatou-diallo,awa-kone @@
On a fait le test pour un client à Cotonou : même appli sur un serveur à Paris et sur un datacenter à Lagos. Sur une page bien faite (peu de JavaScript, images compressées), la différence ressentie en 3G était faible. C'est le poids de la page qui tue, bien plus que les 80 ms de trajet.

Pour la question des données, par contre, c'est un vrai sujet. Regarde ce que dit la CDP au Sénégal et demande à tes partenaires ce qu'ils exigent par écrit, pas à l'oral.

@@ author=moussa-bf at=2026-10-24T13:40 useful=fatou-diallo @@
Nous on est sur un hébergeur local à Ouaga pour la microfinance, c'était une exigence du client. Ça marche, mais prévoyez les sauvegardes hors site vous-mêmes : on a eu deux coupures électriques longues cette année.

@@ author=aminata-codes at=2026-10-24T14:15 @@
Petite astuce qui m'a sauvée : mettre les fichiers statiques derrière un CDN qui a des points de présence à Dakar et Abidjan. Le serveur peut rester où il est, ce sont les fichiers lourds qui voyagent le plus.

@@ author=awa-kone at=2026-10-24T15:48 @@
Je suis curieuse du choix final, tu nous tiendras au courant ? On a la même question pour une appli à Bamako.
