---
title: "Limiter les requêtes d'une petite API : dans le code ou dans nginx ?"
topic: cloud
language: fr
author: awa-kone
at: 2026-08-16T11:05
country: ML
stack: nestjs
---

Bonjour,

Mon API NestJS est exposée sur Internet depuis deux semaines et je vois dans les journaux quelqu'un qui appelle la route de connexion plusieurs centaines de fois par minute.

Je voudrais mettre une limite. J'hésite entre un module de limitation dans NestJS et une règle dans nginx devant l'application. Quelle différence en pratique, et quelle limite raisonnable pour une route de connexion ?

@@ author=serge-tech at=2026-08-16T12:30 useful=awa-kone,fatou-diallo,aminata-codes,yao-dev,moussa-bf @@
Les deux, mais pour des raisons différentes. nginx coupe le gros du bruit avant qu'il ne coûte du processeur à ton application, avec `limit_req_zone` par adresse IP. Le module dans NestJS connaît ton métier et peut limiter par compte, par exemple 5 essais de connexion par e-mail et par quart d'heure.

Pour la connexion, je commencerais par 5 à 10 essais par minute et par IP chez nginx, et une limite par e-mail dans le code.

@@ author=ndeye-fall at=2026-08-16T14:02 useful=awa-kone @@
Attention derrière un proxy : si tu ne configures pas `trust proxy`, toutes tes requêtes semblent venir de l'IP de nginx et tu bloques tout le monde en même temps. Je l'ai vécu un lundi matin.

@@ author=fatou-diallo at=2026-08-17T09:15 useful=awa-kone,ndeye-fall @@
Renvoie aussi un `429` avec l'en-tête `Retry-After`, pour que les clients légitimes sachent quand réessayer.

@@ author=awa-kone at=2026-08-17T20:40 @@
Parfait, la règle nginx est en place et le `trust proxy` aussi. Les appels en boucle sont bloqués.
