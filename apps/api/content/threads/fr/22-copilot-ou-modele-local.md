---
title: "Copilot ou un modèle local quand le courant et la connexion coupent ?"
topic: tools-ai
language: fr
author: boubacar-ml
at: 2026-09-13T22:05
country: ML
stack: python
---

Bonsoir,

À Bamako, je travaille souvent avec des coupures de courant et une connexion qui tombe en fin d'après-midi. Copilot m'aide beaucoup quand le réseau tient, mais il ne sert à rien quand il tombe.

J'ai un portable avec 16 Go de mémoire et pas de carte graphique dédiée. Est-ce qu'un modèle local pour le code est utilisable dans ces conditions, ou est-ce que je vais seulement perdre du temps à installer des choses ?

@@ author=fatou-diallo at=2026-09-13T22:40 useful=boubacar-ml,serge-tech,ines-kouassi @@
Utilisable oui, au niveau d'un bon assistant de complétion, pas au niveau de Copilot sur du code complexe. Avec 16 Go et sans carte graphique, vise un modèle de 3 à 7 milliards de paramètres quantifié. Ça répond en quelques secondes, ça consomme de la batterie, et ça suffit pour des fonctions courtes, des tests et des explications.

@@ author=cheikh-sn at=2026-09-14T08:10 useful=boubacar-ml @@
J'utilise Ollama avec un modèle de 7B quantifié et une extension d'éditeur qui parle à `localhost`. Le premier chargement est lent, après ça va.

@@ author=serge-tech at=2026-09-14T09:35 useful=boubacar-ml,cheikh-sn,fatou-diallo @@
Un conseil de méthode. Utilise le local pour ce qui ne demande pas de réfléchir (boilerplate, regex, commentaires) et garde ton cerveau pour l'architecture. Et ne colle jamais de secrets dans un service distant, c'est un autre avantage du local.

@@ author=ines-kouassi at=2026-09-14T18:20 @@
Pense aussi à une batterie externe ou un onduleur. Le modèle local vide un portable en deux heures.
