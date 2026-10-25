---
title: "Wave Sénégal : la vérification de signature du webhook échoue en PHP"
topic: integrations
language: fr
author: aminata-codes
at: 2026-10-25T07:48
country: SN
stack: laravel
---

Bonjour,

Pour mon SaaS (les salons, j'en parle dans mon billet), je reçois bien les webhooks Wave maintenant, mais la vérification de signature échoue une fois sur deux.

Je calcule un HMAC SHA-256 avec mon secret, puis je compare avec la valeur de l'en-tête :

```php
$payload = json_encode($request->all());
$expected = hash_hmac('sha256', $payload, config('services.wave.webhook_secret'));
if (! hash_equals($expected, $signature)) {
    abort(401);
}
```

Ça marche pour certains paiements et pas pour d'autres, avec le même code. Une idée ?

@@ author=moussa-bf at=2026-10-25T08:20 useful=aminata-codes @@
Je pense que c'est le `json_encode($request->all())`. Tu signes un JSON que tu as reconstruit, pas celui que Wave a envoyé. L'ordre des clés, les espaces ou l'échappement des `/` et des accents peuvent changer. Essaie avec le corps brut : `$request->getContent()`.

@@ author=aminata-codes at=2026-10-25T08:51 @@
Ah, ça expliquerait pourquoi ça casse surtout quand le nom du client a un accent. Je teste dès que j'ai un paiement de test et je reviens vous dire.
