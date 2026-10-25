---
title: "Comment j'ai fait passer mes webhooks Wave ratés de 8 % à presque zéro"
kind: member
author: moussa-bf
category: tutorials
language: fr
group: member-moussa-webhooks
summary: "Un webhook qui échoue, c'est un client qui a payé et une commande qui n'avance pas. Trois changements simples dans mon API Node ont réglé le problème : répondre vite, traiter après, vérifier quand même."
publishedAt: 2026-08-11T21:15
stars: serge-tech, kofi-builds, fatou-diallo, aminata-codes, chidi-eth
cover: covers/21-webhooks-wave-echecs.jpg
---

Pendant deux mois, environ 8 % des paiements Wave de ma boutique en ligne arrivaient chez nous avec du retard, ou n'arrivaient jamais. Le client avait payé, son téléphone le prouvait, et notre base disait « en attente ». Je recevais des messages WhatsApp furieux à vingt-deux heures.

Je raconte ici ce que j'ai changé, dans l'ordre, avec le code. C'est du Node et Express, mais l'idée vaut pour n'importe quel langage.

## Le diagnostic

Mon endpoint de webhook faisait tout dans la requête. Il lisait le corps, vérifiait la signature, mettait à jour la commande, envoyait un SMS de confirmation et un e-mail, puis répondait 200.

Le SMS passait par un agrégateur parfois lent. Quand il mettait plus de dix secondes, le fournisseur considérait que le webhook avait échoué et le renvoyait. Mon code traitait alors la même notification deux fois, et deux fois sur trois la seconde passe plantait sur une contrainte d'unicité. Le résultat ressemblait à une panne aléatoire, alors que tout était reproductible.

## Premier changement, répondre tout de suite

L'endpoint ne fait plus que trois choses. Il vérifie la signature, il écrit l'événement brut dans une table, il répond 200.

```ts
app.post("/webhooks/wave", rawBody, async (req, res) => {
  if (!verifySignature(req)) return res.sendStatus(401);
  await db.insert("webhook_events", {
    provider: "wave",
    externalId: req.body.id,
    payload: req.body,
  }).onConflictDoNothing();
  res.sendStatus(200);
});
```

La requête dure maintenant moins de 50 ms, même quand tout le reste est lent.

## Deuxième changement, traiter après

Un petit worker lit la table toutes les cinq secondes, prend les événements non traités, met à jour la commande dans une transaction, puis marque l'événement comme traité. Le SMS et l'e-mail partent de là, jamais depuis la requête.

La colonne `externalId` est unique par fournisseur. Si Wave renvoie le même événement, l'insertion est ignorée et le worker ne le voit qu'une fois. C'est ce qui a tué les doublons.

## Troisième changement, vérifier quand même

Un webhook n'est pas une garantie de livraison. Il peut se perdre, arriver dans le désordre, ou ne jamais partir si votre serveur était en maintenance à ce moment-là.

J'ai donc ajouté une tâche qui tourne toutes les dix minutes. Elle prend les commandes en attente depuis plus de cinq minutes et interroge directement l'API du fournisseur pour connaître l'état réel. Si le paiement est confirmé, elle crée l'événement manquant, et le worker fait le reste comme d'habitude.

Cette tâche rattrape à elle seule la plupart des cas où le webhook n'est jamais arrivé.

## Les chiffres

Avant, 8 % des paiements restaient bloqués plus de dix minutes. Après trois semaines, moins de 0,3 %, et ce sont presque toujours des paiements que le client lui-même n'a pas finis. Je ne reçois plus de messages à vingt-deux heures.

## Ce que je retiens

Répondre vite coûte une table et un worker, pas une architecture de fusée. Une clé unique en base évite plus de bugs que n'importe quelle vérification dans le code. Et il faut toujours une seconde source de vérité, ici l'API de consultation, parce qu'un système qui dépend d'un seul message réseau finit par perdre un message.

Je publierai le worker complet dans le dépôt de ma boutique si ça intéresse quelqu'un.

@@ author=serge-tech at=2026-08-11T22:40 likes=fatou-diallo,chidi-eth,aminata-codes,kofi-builds @@
Le trio « répondre vite, traiter après, vérifier quand même » devrait être épinglé quelque part. Petite précision, pense à purger la table webhook_events au bout de quelques mois, la mienne faisait 4 millions de lignes.

@@ author=moussa-bf at=2026-08-12T07:15 likes=serge-tech @@
Bien vu, je n'y avais pas pensé. Je vais ajouter une purge à 90 jours en gardant les événements en échec.

@@ author=yao-dev at=2026-08-12T09:02 @@
Question sur la tâche de rattrapage. Tu interroges l'API commande par commande ? Tu n'as pas de limite de débit côté Wave ?

@@ author=moussa-bf at=2026-08-12T12:30 likes=yao-dev,awa-kone @@
Oui, une par une, mais seulement pour les commandes en attente depuis plus de cinq minutes, donc quelques dizaines par jour au maximum. Je limite à 10 requêtes par minute dans le worker, je n'ai jamais touché de limite.

@@ author=chidi-eth at=2026-08-12T16:44 @@
Same pattern here with another provider, and the reconciliation job saved us twice during an outage on their side. Merci pour le code.

@@ author=awa-kone at=2026-08-13T08:20 @@
Merci, ça m'a sauvé ma soirée. J'avais exactement le même symptôme et je cherchais côté réseau.
