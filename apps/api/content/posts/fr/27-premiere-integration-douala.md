---
title: "Ma première intégration Orange Money à Douala, ce qui m'a surprise"
kind: member
author: estelle-cm
category: tutorials
language: fr
group: member-estelle-douala
summary: "Je débute dans les paiements. Voici en quelques lignes les trois choses que personne ne m'avait dites avant de brancher Orange Money sur le site d'un restaurant de Bonamoussadi."
publishedAt: 2026-10-21T10:45
stars: serge-tech, jean-marc-ci
cover: covers/27-premiere-integration-douala.jpg
---

Bonjour, je m'appelle Estelle, j'ai rejoint la plateforme il y a une semaine. J'ai fini ma première intégration de paiement pour un restaurant de Bonamoussadi qui veut prendre des commandes en ligne. Je partage ce que j'aurais voulu lire avant.

## Le montant est un entier

J'envoyais 2 500.00 et le service refusait. Les montants en francs CFA n'ont pas de décimales, il faut envoyer 2500. J'ai perdu une demi-journée là-dessus parce que le message d'erreur parlait de « format invalide » sans dire quel champ.

## Le numéro doit avoir l'indicatif

Mes tests marchaient avec un numéro écrit 6XXXXXXXX et échouaient avec le même écrit avec un espace au milieu. Je nettoie maintenant tous les numéros avant l'envoi, en gardant seulement les chiffres et en ajoutant le 237 devant si besoin.

## Le client peut ne jamais valider

Dans mes tests, tout le monde validait. Dans la vraie vie, des clients ouvrent la demande et la laissent expirer. Ma commande restait en attente pour toujours. J'ai ajouté un délai de 15 minutes, après lequel la commande est annulée et le client peut réessayer.

## Garder une trace de tout

Au début, je ne journalisais rien, et quand une commande bloquait je ne savais pas si le problème venait de moi ou du service. Maintenant j'écris chaque requête envoyée et chaque réponse reçue dans un fichier, sans les données personnelles. En cas de doute, je relis ce fichier avant de poser une question, et mes questions sont devenues beaucoup plus précises.

Si vous êtes aussi débutant, ne vous découragez pas, les messages d'erreur sont souvent pires que le problème. Et posez vos questions ici, les réponses arrivent vite.

@@ author=paul-cm at=2026-10-21T13:05 likes=jean-marc-ci @@
Bienvenue Estelle, et content de voir une autre Camerounaise ici. Pour les numéros, la bibliothèque libphonenumber fait ce nettoyage et ça évite les cas bizarres.

@@ author=estelle-cm at=2026-10-21T16:30 @@
Merci Paul, je regarde ça dès demain.
