---
title: "Le client a cliqué deux fois, il a été débité deux fois"
kind: member
author: fatou-diallo
category: tutorials
language: fr
group: member-fatou-idempotence
summary: "Un double clic, une connexion lente, un retry automatique, et la même commande est payée deux fois. L'idempotence est la parade, et elle tient en une colonne et un en-tête."
publishedAt: 2026-07-09T22:10
stars: serge-tech, kofi-builds
cover: covers/28-idempotence-paiements.jpg
---

Le mois dernier, une cliente m'a écrit à minuit pour dire qu'elle avait été débitée deux fois pour la même commande de 18 000 F CFA. J'ai regardé les journaux. Deux requêtes identiques, à 1,2 seconde d'écart, venues du même téléphone.

Ce n'était pas un bug exotique. C'était un double clic sur un bouton de paiement, avec une connexion lente qui n'avait pas encore répondu à la première requête.

## Pourquoi ça arrive

Un utilisateur clique deux fois parce que rien ne bouge. Un client HTTP réessaie parce qu'une réponse a mis trop de temps. Un opérateur renvoie un webhook parce qu'il n'a pas eu de réponse assez vite. Dans les trois cas, le même ordre arrive deux fois, et votre serveur n'a aucun moyen de savoir que c'est le même.

## La parade, la clé d'idempotence

Le principe est ancien. Le client génère un identifiant unique pour chaque intention de paiement, et l'envoie avec la requête. Le serveur garde cet identifiant. S'il le revoit, il ne refait rien et renvoie la réponse de la première fois.

Côté base de données, une colonne `idempotency_key` avec une contrainte d'unicité suffit.

```sql
ALTER TABLE payments
  ADD COLUMN idempotency_key text,
  ADD CONSTRAINT payments_key_unique UNIQUE (idempotency_key);
```

Côté API, le client envoie un en-tête `Idempotency-Key`. Le serveur tente d'insérer le paiement. Si l'insertion échoue à cause de la contrainte, il lit le paiement existant et le renvoie tel quel.

## Où générer la clé

Pas au moment du clic, mais au moment où la page de paiement s'affiche. Ainsi, deux clics sur la même page envoient la même clé. Si l'utilisateur recharge la page et recommence vraiment, une nouvelle clé est créée, ce qui est le comportement voulu.

Je mets la clé dans un champ caché du formulaire. En plus, je désactive le bouton au premier clic, mais je ne compte jamais là-dessus, c'est un confort et pas une protection.

## Ce qu'il ne faut pas faire

Utiliser le montant et le numéro de téléphone comme clé. Un client peut légitimement payer deux fois 5 000 F CFA le même jour depuis le même numéro, pour deux commandes différentes. La clé doit représenter une intention, pas un contenu.

## Et du côté des webhooks

Le même raisonnement s'applique à l'envers. L'opérateur envoie un identifiant d'événement. Je le stocke avec une contrainte d'unicité, et si je le revois, je réponds 200 sans rien traiter.

Depuis ces deux colonnes, je n'ai plus eu de double débit. J'ai aussi remboursé la cliente le soir même et lui ai écrit un message d'excuses, parce qu'un bug technique reste un problème pour la personne qui le subit.

@@ author=serge-tech at=2026-07-10T07:40 likes=kofi-builds @@
Bon rappel. J'ajouterais une expiration sur les clés, 24 heures suffisent, sinon la table grossit pour rien.

@@ author=fatou-diallo at=2026-07-10T09:15 likes=serge-tech @@
Oui, bonne idée. Une tâche de nettoyage chaque nuit, et je garde les clés des paiements encore en attente.

@@ author=yao-dev at=2026-07-10T12:30 @@
Merci, ça m'a sauvé la mise. J'avais exactement ce double clic sur un formulaire d'inscription payante.

@@ author=aminata-codes at=2026-07-11T08:20 @@
Question, si la première requête a échoué côté opérateur, tu renvoies quand même la même réponse en erreur ? Ou tu laisses le client réessayer avec la même clé ?
