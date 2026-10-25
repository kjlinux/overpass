---
title: "Orange Money : où garder le jeton d'accès qui expire au bout d'une heure ?"
topic: integrations
language: fr
author: ines-kouassi
at: 2026-09-08T21:25
country: CI
stack: php
---

Bonsoir,

Avec l'API Orange Money, le jeton d'accès est valable une heure. Pour l'instant, je demande un nouveau jeton à chaque paiement, ce qui ajoute une requête et un temps d'attente inutile pour le client.

Si je garde le jeton, comment savoir quand il expire ? Et que se passe-t-il si deux paiements arrivent en même temps au moment où il vient d'expirer ?

@@ author=aminata-codes at=2026-09-08T22:00 useful=ines-kouassi,serge-tech,yao-dev,moussa-bf accepted @@
Garde le jeton en cache (Redis, ou même un fichier si tu es sur un seul serveur) avec la durée de vie renvoyée dans `expires_in`, moins une marge de 60 secondes. Avant chaque appel, tu lis le cache, et si le jeton est absent tu en demandes un nouveau.

Pour les deux paiements simultanés, pose un verrou court autour de la demande de jeton, sinon tu en génères deux. Ce n'est pas grave, mais ça évite du bruit.

```php
$token = Cache::remember('om_token', $ttl - 60, fn () => $this->fetchToken());
```

@@ author=serge-tech at=2026-09-09T07:30 useful=ines-kouassi @@
Prévois aussi un plan B : si l'API répond 401, supprime le jeton du cache, redemande-le une fois et rejoue la requête. Une seule fois, pas en boucle.

@@ author=yao-dev at=2026-09-09T12:15 @@
`Cache::remember` fait exactement ça et c'est joli. Merci Aminata, je ne connaissais pas la marge de 60 secondes.

@@ author=ines-kouassi at=2026-09-09T19:50 useful=aminata-codes @@
C'est en place depuis ce soir, la requête en trop a disparu et le paiement est plus rapide.
