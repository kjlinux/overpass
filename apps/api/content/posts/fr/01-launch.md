---
title: "Overpass ouvre ses portes"
kind: news
category: tech-news
language: fr
group: launch
cover: covers/launch.png
summary: "Ce qu'Overpass propose le jour de son lancement, et ce qui dépend de vous."
publishedAt: 2026-10-23
---

Overpass est la bourse des intégrations africaines vérifiées. Les développeurs y échangent ce que la documentation officielle ne dit pas : le code qui marche, les pièges connus, et des vérifications datées par d'autres développeurs.

## Trois briques

**Les itinéraires.** Des fiches classées par service, pays et stack. Chaque fiche affiche son état : voie libre quand des membres l'ont vérifiée récemment, à vérifier quand personne ne l'a confirmée, signalée cassée quand un piège ouvert la bloque. L'état n'est jamais saisi : il se calcule à partir des vérifications.

**Le Simulateur.** Un simulateur qui rejoue les cas réels d'un paiement mobile money sans compte marchand : Wave, PayDunya, CinetPay et PI-SPI pour commencer. Les webhooks signés arrivent sur votre poste avec une seule commande, sans tunnel ni certificat.

**Le serveur MCP.** Il sert les fiches aux assistants de code, pour que l'IA de votre éditeur écrive la bonne intégration locale au lieu d'une intégration imaginaire.

## Ce que vous trouvez aujourd'hui

- Quinze services au catalogue, avec les pays où leur documentation publique confirme la présence, chacun avec sa source et sa date de consultation.
- Dix fiches écrites par l'équipe à partir de la documentation officielle et de nos intégrations en production. Elles sont toutes à l'état « à vérifier » : c'est à vous de les confirmer ou de signaler un piège.
- Six thèmes de discussion, un blog par membre, et une newsletter hebdomadaire.

## Ce qui dépend de vous

Un pays non confirmé pour un opérateur le devient dès qu'une fiche de ce service dans ce pays passe en voie libre. La carte des pays couverts, c'est vous qui la complétez. Si un service manque, proposez-le ; si un simulateur manque, votez pour lui.

Overpass est le projet de l'équipe Ghostapi, Côte d'Ivoire, pour la Coupe d'Afrique des Développeurs 2026 de Systalink. Le code est public, sous licence permissive, et chaque usage de l'IA dans sa construction est consigné dans le dépôt.
