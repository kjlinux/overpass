---
title: "Wave CI : mon webhook n'arrive jamais sur mon serveur local"
topic: integrations
language: fr
author: yao-dev
at: 2026-10-23T16:42
country: CI
stack: laravel
---

Bonsoir à tous,

Je suis sur ma première intégration Wave Checkout pour un client (une boutique de pagnes à Treichville). La création de la session marche, je reçois bien le lien de paiement, je paie avec le numéro de test, la page Wave me dit que c'est bon.

Mais côté Laravel, rien. Ma route `POST /webhooks/wave` n'est jamais appelée. J'ai mis un `Log::info()` tout en haut du contrôleur, le fichier de log reste vide.

Dans le tableau de bord j'ai mis l'URL `http://localhost:8000/webhooks/wave`. J'ai aussi essayé avec mon IP locale `192.168.1.24`, pareil.

```php
Route::post('/webhooks/wave', [WaveWebhookController::class, 'handle']);
```

J'ai désactivé le CSRF pour cette route. Je ne vois pas ce qui manque. Quelqu'un a déjà eu ça ?

@@ author=serge-tech at=2026-10-23T17:05 useful=yao-dev,aminata-codes,moussa-bf accepted @@
Salut Yao. Le problème n'est pas ton code : Wave appelle ton URL depuis ses serveurs, sur Internet. `localhost` et `192.168.x.x`, c'est ta machine et ton réseau à toi, Wave ne peut pas les joindre.

Deux solutions :

1. Pour développer, passe par la piste d'essai d'Overpass. Tu lances `npx overpass-cli listen --forward-to http://localhost:8000/webhooks/wave` et les webhooks simulés arrivent sur ton Laravel, sans tunnel ni port ouvert.
2. Pour tester avec le vrai Wave, il te faut une URL publique en HTTPS : un petit VPS, ou un tunnel le temps du test.

Et garde ton `Log::info()`, c'est le bon réflexe.

@@ author=aminata-codes at=2026-10-23T17:31 useful=yao-dev @@
Je confirme, j'ai perdu une demi-journée sur exactement la même chose l'an dernier. Autre piège pour la suite : en prod, mets bien ta route hors du middleware `auth`, sinon Wave reçoit une redirection vers la page de connexion et tu ne vois rien non plus.

@@ author=yao-dev at=2026-10-23T18:12 @@
Merci beaucoup, c'était ça. J'ai lancé le relais avec la commande de Serge, le webhook arrive en deux secondes. Je me sens un peu bête mais j'ai appris un truc 😅

@@ author=moussa-bf at=2026-10-23T19:40 @@
Pas bête du tout, tout le monde passe par là. Gardez ce fil, je vais l'envoyer à mon stagiaire.
