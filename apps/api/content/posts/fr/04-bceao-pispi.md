---
title: "PI-SPI : la BCEAO a lancé le paiement instantané interopérable de l'UEMOA"
kind: news
category: tech-news
language: fr
group: bceao-pispi
summary: "Ce que la plateforme change pour un développeur des huit pays de l'Union, et comment commencer sans attendre un certificat."
publishedAt: 2026-10-23
---

La Banque Centrale des États de l'Afrique de l'Ouest a lancé officiellement PI-SPI, la plateforme interopérable du système de paiement instantané de l'UEMOA. Source : le communiqué de lancement publié sur bceao.int, consulté le 23 octobre 2026.

## Ce que c'est

Une infrastructure commune aux huit pays de l'Union (Bénin, Burkina Faso, Côte d'Ivoire, Guinée-Bissau, Mali, Niger, Sénégal, Togo) qui relie banques, établissements de monnaie électronique et autres participants pour des paiements instantanés, de compte à compte, quel que soit le fournisseur de chaque côté.

Pour un développeur, l'intérêt est double : une seule API métier, dite API Business, et des alias (numéro de téléphone, identifiant marchand) pour désigner un payeur sans connaître sa banque ou son opérateur.

## Ce que cela change

- Un commerce en ligne au Sénégal peut être payé par un client au Mali sans intégrer l'opérateur de ce client.
- Les demandes de paiement remplacent la redirection vers une page tierce : le marchand crée la demande, le client la confirme chez son fournisseur, le marchand reçoit le résultat par webhook.
- Les participants restent les intermédiaires : un business accède à PI-SPI par sa banque ou son établissement de monnaie électronique, pas directement.

## Ce qui freine aujourd'hui

Le bac à sable officiel demande un certificat client (TLS mutuel) et un enregistrement auprès d'un participant. C'est sain pour la production, mais cela bloque le premier jour de quiconque veut juste essayer.

C'est pour cela qu'Overpass propose un simulateur PI-SPI : les mêmes routes que la spécification 1.5.0, sans certificat, avec les scénarios d'échec, et le renvoi vers le bac à sable officiel quand vous êtes prêts. Le guide pas à pas est sur ce blog, et la fiche Node.js pour le Sénégal donne le code complet.
