---
title: "Encaisser un paiement Wave Checkout au Sénégal depuis Laravel"
service: wave
country: SN
stack: laravel
language: fr
---

Source : docs.wave.com, pages Checkout API et Webhooks, consultées le 23 octobre 2026. Le Simulateur Overpass rejoue cette API, signature comprise.

## Prérequis

- Un compte Wave Business au Sénégal avec l'accès API activé. La clé commence par `wave_sn_prod_` en production et `wave_sn_test_` pour le bac à sable.
- Un secret de webhook, créé depuis le portail Business en déclarant votre URL.
- Laravel 11 ou 12, PHP 8.2 ou plus.

## Installation

```
WAVE_API_KEY=wave_sn_test_xxxxxxxx
WAVE_WEBHOOK_SECRET=wave_whs_xxxxxxxx
WAVE_BASE=https://api.wave.com
```

Wave n'envoie pas de jeton CSRF : sans exclusion, Laravel répond 419 à chaque webhook. Depuis Laravel 11, l'exclusion se déclare dans `bootstrap/app.php`, car le fichier `app/Http/Middleware/VerifyCsrfToken.php` n'existe plus.

```php
->withMiddleware(function (Middleware $middleware) {
    $middleware->validateCsrfTokens(except: ['webhooks/wave']);
})
```

## Paiement

```php
$session = Http::withToken(config('services.wave.key'))
    ->post(config('services.wave.base') . '/v1/checkout/sessions', [
        'amount' => (string) $order->total_xof,
        'currency' => 'XOF',
        'client_reference' => $order->reference,
        'success_url' => route('orders.paid', $order),
        'error_url' => route('orders.failed', $order),
    ])
    ->throw()
    ->json();

$order->update(['wave_session_id' => $session['id']]);
return redirect()->away($session['wave_launch_url']);
```

La réponse porte `id` (préfixe `cos-`), `wave_launch_url`, `payment_status` (`processing`, `cancelled`, `succeeded`) et `checkout_status` (`open`, `complete`, `expired`).

## Webhook

L'en-tête `Wave-Signature` vaut `t=<secondes unix>,v1=<hex>`. La valeur `v1` est le HMAC-SHA256 du secret sur la chaîne `t` suivie du corps brut, octet pour octet.

```php
Route::post('/webhooks/wave', function (Request $request) {
    $raw = $request->getContent();
    $parts = collect(explode(',', $request->header('Wave-Signature', '')))
        ->mapWithKeys(fn ($p) => [strtok($p, '=') => substr($p, strlen(strtok($p, '=')) + 1)]);
    $expected = hash_hmac('sha256', $parts['t'] . $raw, config('services.wave.webhook_secret'));
    abort_unless(hash_equals($expected, $parts['v1'] ?? ''), 401);
    abort_if(abs(time() - (int) $parts['t']) > 300, 401);

    $event = json_decode($raw, true);
    if ($event['type'] === 'checkout.session.completed') {
        Order::where('wave_session_id', $event['data']['id'])
            ->whereNull('paid_at')
            ->update(['paid_at' => now()]);
    }
    return response()->noContent();
});
```

Les deux types utiles sont `checkout.session.completed` et `checkout.session.payment_failed`.

## Pièges connus

- La signature porte sur le corps brut. `$request->all()` puis `json_encode` change l'ordre ou les espaces et la vérification échoue. Lisez `getContent()`.
- Le montant XOF est une chaîne sans décimales. `"1500.00"` est refusé.
- Une session expire au bout de trente minutes : un client qui revient plus tard doit obtenir une nouvelle session, pas la même URL.
- `client_reference` est optionnel mais précieux : c'est votre seule clé pour retrouver la commande si vous perdez l'identifiant de session.
- La clé est liée au pays. Une clé `wave_sn_` ne crée pas de session pour un client ivoirien ; ouvrez un compte Business dans chaque pays.
- Répondez 2xx vite et traitez en file d'attente si besoin. Wave réessaie en cas d'erreur, et le même événement peut donc arriver deux fois.
- Les numéros sénégalais ont neuf chiffres. Wave n'a pas besoin du numéro pour une session Checkout : c'est le client qui s'identifie dans l'application.
- Pendant une rotation de secret, l'en-tête porte plusieurs valeurs `v1` : acceptez la requête si l'une d'elles correspond. Wave réessaie jusqu'à trois jours en l'absence de réponse 2xx.
