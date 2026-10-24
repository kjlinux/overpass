---
title: "Comment nous avons construit les simulateurs"
kind: news
category: tutorials
language: fr
group: simulators
cover: covers/simulators.png
summary: "Quatre opérateurs rejoués depuis leur documentation publique, sans logo, marqués non officiels : la méthode et ses limites."
publishedAt: 2026-10-23
---

La piste d'essai d'Overpass rejoue Wave, PayDunya, CinetPay et PI-SPI. Voici comment chaque simulateur est fait, et ce qu'il ne prétend pas être.

## Une seule source : la documentation publique

Chaque opérateur est un dossier dans le dépôt, avec un fichier de protocole qui cite sa source et sa date de consultation. Wave vient de docs.wave.com (Checkout et Webhooks). PayDunya de developers.paydunya.com. CinetPay du README de son SDK PHP officiel 3.0.1 sur GitHub. PI-SPI de la spécification API Business 1.5.0 publiée par la BCEAO.

Quand la documentation ne donne pas un détail, un chemin ou le texte d'un refus, le simulateur fait un choix et le dit : ses messages commencent par « Overpass simulator ». Aucun logo, aucune couleur de marque, et la mention « non officiel » partout.

## Ce que le simulateur reproduit

- Les routes, les corps et les codes de réponse documentés.
- L'authentification telle que l'opérateur la décrit : jeton Bearer pour Wave, en-têtes de clés pour PayDunya, connexion puis jeton pour CinetPay, OAuth 2 pour PI-SPI.
- Les webhooks avec leur signature réelle. Pour Wave, l'en-tête `Wave-Signature` est calculé exactement comme en production, sur les mêmes octets : le code de vérification que vous écrivez contre le simulateur marche tel quel contre l'opérateur.
- Les cas d'échec que la documentation nomme : solde insuffisant, session introuvable, montant invalide, jeton expiré, quota dépassé.

## Ce qu'il ne reproduit pas

- Les délais réels d'un client qui tape son code secret : le simulateur répond en quelques secondes.
- Les écrans de l'opérateur : il n'y a pas de page de paiement, le scénario se choisit par une valeur de la requête.
- Les cas non documentés. Si vous en rencontrez un en production, c'est précisément ce qu'une fiche Overpass doit raconter.

## Les webhooks sur votre poste

Recevoir un webhook exige d'habitude une URL publique. La commande `npx overpass listen` ouvre une connexion sortante et rejoue chaque livraison sur votre serveur local, sans tunnel ni certificat, en transmettant corps et en-têtes sans les modifier. Les livraisons sont conservées sept jours puis purgées.

## Et les autres opérateurs

Orange Money, Moov Money, MTN MoMo et les autres sont au catalogue sans simulateur. Sur la page de chaque service, un bouton « Je veux un simulateur » compte les votes : c'est lui qui décide du prochain.
