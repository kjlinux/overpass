---
title: "Orange Money BF : 401 en production alors que tout passe en sandbox"
topic: integrations
language: fr
author: moussa-bf
at: 2026-10-24T08:15
country: BF
stack: symfony
---

Bonjour,

Back-office d'une institution de microfinance à Ouaga, Symfony 6. L'intégration Orange Money marche parfaitement en sandbox depuis deux semaines. Hier on a basculé en production avec les accès reçus du partenaire, et chaque appel de paiement répond :

```
HTTP 401 Unauthorized
{"code":"invalid_token","message":"Access token expired or invalid"}
```

Le jeton est pourtant récupéré juste avant l'appel, et je ne le mets pas en cache. J'ai vérifié trois fois les identifiants copiés depuis le mail. Je commence à sécher.

@@ author=fatou-diallo at=2026-10-24T08:47 useful=moussa-bf @@
Tu as bien changé l'URL de base aussi ? On a eu le coup à Dakar : identifiants de prod mais adresse de sandbox restée dans le `.env` de la préprod. Le jeton était délivré par un environnement et utilisé sur l'autre.

@@ author=serge-tech at=2026-10-24T09:20 useful=moussa-bf,fatou-diallo,yao-dev accepted @@
Trois choses à vérifier, dans cet ordre :

1. Que l'URL du jeton et l'URL de paiement pointent vers le même environnement (ce que dit Fatou, c'est la cause la plus fréquente).
2. Que l'en-tête est exactement `Authorization: Bearer <jeton>`, avec l'espace. Certains clients HTTP ajoutent des guillemets si la valeur vient d'une variable mal échappée.
3. Que la clé marchande de production est bien activée de leur côté. Chez certains partenaires, il faut un mail de confirmation après la signature, et tant qu'il n'est pas envoyé tout répond 401.

Logue la réponse complète de l'appel du jeton (sans le jeton lui-même) : la durée de validité et le périmètre te disent souvent où est le problème.

@@ author=moussa-bf at=2026-10-24T11:02 @@
C'était le point 1. Notre variable `OM_BASE_URL` était surchargée par un vieux fichier `.env.local` sur le serveur. Merci à vous deux, ça paie depuis ce matin.
