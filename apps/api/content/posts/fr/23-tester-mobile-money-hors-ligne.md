---
title: "Tester une intégration mobile money sans réseau et sans sandbox"
kind: member
author: serge-tech
category: tutorials
language: fr
group: member-serge-tests-hors-ligne
summary: "Les sandboxes tombent, les identifiants expirent, la connexion coupe en pleine démo. Voici comment j'écris des tests de paiement qui tournent dans le train, sur un portable, sans aucun appel réseau."
publishedAt: 2026-10-12T09:05
stars: kofi-builds, fatou-diallo, yao-dev, aminata-codes, chidi-eth, moussa-bf, awa-kone, ndeye-fall, ama-mensah, kwame-dev, adjoa-tg, olu-codes, ines-kouassi, boubacar-ml, cheikh-sn, mariama-gn, tunde-ng, rokia-traore, paul-cm, fanta-ci, emeka-dev, grace-ug, lamine-sn, esi-gh, dieudonne-bj
cover: covers/23-tester-mobile-money-hors-ligne.jpg
---

Il y a deux ans, j'ai perdu une démo parce que la sandbox d'un opérateur était en maintenance depuis le matin. Personne ne m'avait prévenu, et le client regardait mon écran pendant que je rafraîchissais la page.

Depuis, aucun de mes tests automatiques n'appelle un vrai service de paiement. Voici la méthode, dans l'ordre où je la mets en place sur un nouveau projet.

## Le principe

Un test qui dépend du réseau échoue pour des raisons qui ne sont pas les vôtres. Un test de paiement a besoin de trois choses, une requête sortante prévisible, une réponse prévisible, et un webhook qu'on peut déclencher à la main.

Je sépare donc le code en deux zones. Mon code métier parle à une interface, `PaymentProvider`, avec trois méthodes, `createPayment`, `getPayment` et `parseWebhook`. Un seul fichier contient le vrai client HTTP. Tout le reste ne sait pas qu'il existe.

## Étape 1, un faux fournisseur en mémoire

Le faux fournisseur est une classe de trente lignes. Elle stocke les paiements dans un tableau et expose une méthode qui permet au test de changer l'état d'un paiement.

```ts
class FakeProvider implements PaymentProvider {
  private payments = new Map<string, Payment>();
  async createPayment(input: NewPayment) {
    const id = `fake_${this.payments.size + 1}`;
    this.payments.set(id, { id, status: "pending", ...input });
    return { id, redirectUrl: `https://pay.test/${id}` };
  }
  async getPayment(id: string) {
    return this.payments.get(id)!;
  }
  settle(id: string, status: "paid" | "failed") {
    this.payments.get(id)!.status = status;
  }
}
```

Avec ça, un test d'achat complet tient en dix lignes. Je crée une commande, je règle le paiement, je déclenche le traitement, je vérifie que la commande est payée.

## Étape 2, des webhooks enregistrés

Pour le webhook, je ne l'invente pas. La première fois que je reçois une vraie notification, en sandbox ou en production, je l'enregistre telle quelle dans un fichier, avec ses en-têtes et sa signature. Ce fichier devient une fixture.

Mes tests rejouent ces fixtures contre mon endpoint. Je vérifie que la bonne signature passe, qu'une signature modifiée d'un caractère est refusée, et que la même notification envoyée deux fois ne crée qu'un seul traitement.

Pour la signature, j'écris un petit helper qui fabrique une notification valide avec un secret de test. Ainsi je peux aussi fabriquer des cas que le fournisseur ne m'enverra jamais, un montant négatif, un identifiant inconnu, un JSON tronqué.

## Étape 3, simuler les pannes

C'est la partie que presque tout le monde saute, et c'est la plus utile. Mon faux fournisseur sait échouer sur demande. Il peut renvoyer une erreur 500, attendre trop longtemps, ou renvoyer un statut que mon code ne connaît pas.

Je teste ce que mon application affiche dans chaque cas. Un paiement en attente doit afficher un état clair, pas une erreur. Une erreur du fournisseur doit laisser la commande en attente, pas la supprimer. Chaque fois que je trouve un cas qui casse, il devient un test pour toujours.

## Étape 4, un seul test contre le vrai service

Je garde un seul test d'intégration réel, marqué à part, que je lance à la main avant une livraison. Il crée un paiement en sandbox et vérifie que la réponse a la forme attendue. S'il échoue, je sais que le fournisseur a changé quelque chose, et je corrige le client HTTP, pas la logique.

Ce test ne bloque jamais l'intégration continue. Il est là comme une alarme, pas comme un portail.

## Ce que ça change

Ma suite de paiement tourne en moins de deux secondes. Je la lance à chaque sauvegarde, dans le train, chez moi pendant les coupures, partout. Je n'ai plus eu de démo ruinée.

La vraie différence est psychologique. Quand les tests sont rapides et ne dépendent de personne, on les écrit sans réfléchir, et on touche au code des paiements sans trembler.

## Pour aller plus loin

Si vous voulez essayer sans écrire votre faux fournisseur, les simulateurs de cette plateforme peuvent servir de base pour comprendre les formats de réponse. Mais gardez toujours votre interface à vous entre le code métier et l'extérieur.

@@ author=fatou-diallo at=2026-10-12T09:48 likes=kofi-builds,yao-dev,aminata-codes,moussa-bf,awa-kone,ndeye-fall,ines-kouassi,mariama-gn @@
La phrase sur les pannes simulées est la plus importante de tout le billet. Mon équipe n'a testé que le cas heureux pendant deux ans.

@@ author=kwame-dev at=2026-10-12T10:20 likes=chidi-eth,tunde-ng,olu-codes,esi-gh @@
Clear and practical. I would add one thing, record the fixtures from the real provider and commit them, otherwise your fake drifts from reality without anyone noticing.

@@ author=serge-tech at=2026-10-12T11:02 likes=kwame-dev,kofi-builds,fatou-diallo,emeka-dev,grace-ug,paul-cm @@
Tout à fait Kwame, c'est aussi pour ça que le test réel unique existe. Quand il casse, je regénère les fixtures.

@@ author=boubacar-ml at=2026-10-12T14:35 likes=cheikh-sn @@
Question de débutant. Où tu mets le helper qui signe les webhooks, dans le dossier de tests ou dans le code principal ?

@@ author=serge-tech at=2026-10-12T15:10 likes=boubacar-ml,rokia-traore,lamine-sn @@
Dans les tests, jamais dans le code principal. Le secret de test ne doit exister nulle part ailleurs, et le code de production ne doit pas savoir fabriquer de fausses signatures.

@@ author=lamine-sn at=2026-10-12T19:25 @@
Merci, ça m'a sauvé. Je viens de brancher le faux fournisseur sur mon projet et les tests passent en 1,4 seconde.

@@ author=dieudonne-bj at=2026-10-13T08:12 likes=fanta-ci,adjoa-tg,mariama-gn,ama-mensah,cheikh-sn,awa-kone,yao-dev @@
J'épingle ce billet dans l'équipe. Le coup de la signature modifiée d'un seul caractère, on ne le teste jamais et c'est là que les failles se cachent.

@@ author=salif-bf at=2026-10-13T17:44 @@
Est-ce que ça marche aussi pour les paiements par USSD où la validation se fait sur le téléphone du client ? Le statut change sans qu'on ait rien à déclencher de notre côté.

@@ author=serge-tech at=2026-10-13T20:05 likes=salif-bf @@
Oui, c'est le même schéma. Du point de vue de ton code, c'est un paiement qui passe de « pending » à « paid » plus tard. Ton faux fournisseur appelle `settle` quand le test le décide, et tu rejoues le webhook.
