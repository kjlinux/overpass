---
title: "PI-SPI pas à pas sur la piste d'essai"
kind: news
category: tutorials
language: fr
group: pispi-guide
cover: covers/pispi-guide.png
summary: "Obtenir un jeton, créer une demande de paiement, la voir payée et recevoir le webhook sur son poste, en moins de cinq minutes."
publishedAt: 2026-10-23
---

PI-SPI est la plateforme interopérable de paiement instantané de la BCEAO, commune aux huit pays de l'UEMOA. Son bac à sable officiel demande un certificat client : la piste d'essai Overpass reproduit les mêmes routes sans certificat, avec les scénarios d'échec en plus, pour que vous puissiez écrire votre intégration aujourd'hui et la pointer sur le bac à sable officiel demain.

## 1. Une clé de test

Ouvrez la piste d'essai, choisissez PI-SPI et créez une clé. Elle sert d'identifiant et de secret OAuth 2 pour le simulateur. Aucune inscription n'est nécessaire pour un premier essai.

## 2. Le jeton

```
POST /v1/sandbox/pi-spi/oauth/token
content-type: application/x-www-form-urlencoded

grant_type=client_credentials&client_id=<clé>&client_secret=<secret>
```

La réponse porte `access_token` et `expires_in`. Mettez le jeton en cache jusqu'à l'expiration moins une marge : en production, le quota d'appels renvoie 429 à qui redemande un jeton à chaque requête.

## 3. La demande de paiement

```
POST /v1/sandbox/pi-spi/piz/v1/payment-requests
authorization: Bearer <jeton>

{ "amount": 2500, "currency": "XOF", "payerAlias": "+221770000000", "reference": "CMD-1042" }
```

La piste d'essai répond comme la spécification 1.5.0 le décrit, avec l'identifiant de la demande et son état initial. Les scénarios se déclenchent par le montant ou l'alias : la page de chaque scénario indique la valeur à utiliser pour obtenir un refus, une expiration ou un succès.

## 4. Le webhook sur votre poste

```
npx overpass listen --forward-to http://localhost:3000/webhooks/pispi
```

La commande ouvre une connexion sortante vers Overpass et rejoue chaque webhook du simulateur sur votre serveur local, corps et en-têtes inchangés. L'inspecteur montre chaque livraison avec le code de réponse et la durée, et un bouton Rejouer.

## 5. Avant la production

- Demandez à votre participant PI-SPI le certificat client et les identifiants du bac à sable officiel.
- Remplacez la base d'URL. Les routes et les corps ne changent pas.
- Gardez la vérification de signature et la relecture de la demande avant livraison : c'est ce qui vous protège d'un webhook rejoué ou forgé.

La fiche « Créer et suivre une demande de paiement PI-SPI au Sénégal depuis Node.js » donne le code complet et les pièges connus.
