---
title: "Ce que mon premier menu USSD m'a appris en trois semaines"
kind: member
author: boubacar-ml
category: tutorials
language: fr
group: member-boubacar-ussd
summary: "Un menu USSD n'a ni écran tactile ni historique, et la session coupe sans prévenir. Cinq règles que j'ai apprises à Bamako en construisant un service d'inscription pour une coopérative."
publishedAt: 2026-09-22T12:20
stars: yao-dev
cover: covers/24-menus-ussd-lecons.jpg
---

Je suis nouveau ici, et voici mon premier billet. Je viens de livrer un menu USSD pour une coopérative de producteurs de karité près de Bamako. Les membres s'inscrivent, consultent leurs livraisons et demandent une avance, tout depuis un téléphone basique.

Je n'avais jamais fait d'USSD. Voici ce que j'aurais voulu savoir avant de commencer.

## Chaque écran doit tenir en peu de caractères

Un écran USSD affiche environ 160 caractères, parfois moins selon l'opérateur. Mon premier menu faisait trois lignes de présentation avant les options, et sur certains téléphones la fin était coupée. Maintenant, l'écran donne directement les choix, numérotés de 1 à 5 au maximum.

## La session peut mourir à tout moment

L'utilisateur reçoit un appel, le réseau saute, la session expire au bout de 30 à 90 secondes d'inactivité. Mon application ne doit donc rien perdre quand cela arrive. Je sauvegarde l'état de chaque étape en base, avec l'identifiant de session et le numéro, et si la personne revient, je lui propose de reprendre.

## Ne jamais demander deux choses dans un écran

Quand j'ai demandé « nom et village » dans le même écran, la moitié des gens ont écrit les deux sans séparateur. Un écran, une question. Cela rallonge le parcours, mais cela évite l'erreur.

## Valider tout de suite

Si quelqu'un tape une lettre à la place d'un montant, il faut le dire sur l'écran suivant et reposer la même question. Mon premier code plantait. Aujourd'hui chaque étape connaît son format et renvoie un message court.

## Toujours une sortie

Le 0 sert à revenir en arrière et le 00 à quitter, sur tous les écrans, sans exception. Les utilisateurs apprennent vite, mais seulement si c'est cohérent.

Je recommande de tester avec de vrais utilisateurs dès le troisième jour. Les deux premières coopératrices à qui j'ai fait essayer ont trouvé trois problèmes que je ne voyais pas.

@@ author=yao-dev at=2026-09-22T14:02 likes=ndeye-fall @@
Bienvenue et bravo pour ce premier billet. La règle sur la reprise de session est celle que j'oublie à chaque fois.

@@ author=ndeye-fall at=2026-09-23T09:30 @@
Tu gères comment les langues locales ? Sur mes essais, les accents faisaient planter l'affichage selon le téléphone.

@@ author=boubacar-ml at=2026-09-23T13:15 likes=ndeye-fall,yao-dev @@
Je reste en français sans accents pour l'instant. J'ai remplacé tous les caractères spéciaux par des lettres simples, et c'est lisible partout. Le bambara viendra avec une version audio, je pense.
