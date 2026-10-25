---
title: "PI-SPI : comment obtenir un accès sandbox quand on est développeur indépendant ?"
topic: integrations
language: fr
author: dieudonne-bj
at: 2026-10-11T09:40
country: BJ
---

Bonjour,

Je voudrais tester le système d'interopérabilité PI-SPI de la BCEAO pour un projet de paiement entre portefeuilles. La documentation parle de participants agréés, mais je suis seul et sans agrément.

Existe-t-il un moyen d'avoir un environnement d'essai sans être une banque ou un établissement de monnaie électronique ? Ou faut-il passer par un partenaire ?

@@ author=serge-tech at=2026-10-11T10:30 useful=dieudonne-bj,moussa-bf @@
D'après ce que j'en sais, l'accès direct est réservé aux participants agréés. Pour un indépendant, le chemin réaliste est de passer par un partenaire (banque, ou agrégateur déjà raccordé) qui t'expose son propre bac à sable. Je n'ai pas de confirmation à jour, donc demande directement aux équipes techniques de l'agrégateur que tu vises.

@@ author=moussa-bf at=2026-10-12T14:15 @@
Même constat de mon côté. En attendant, simule les réponses avec les exemples de la spécification pour avancer sur ton code.
