---
title: "Encaisser un paiement Orange Money en Côte d'Ivoire depuis Laravel"
service: orange-money
country: CI
stack: laravel
language: fr
---

Source : Orange Money Web Payment API sur developer.orange.com (apis/om-webpay), consultée le 23 octobre 2026. Les points marqués « vécu » viennent de nos propres intégrations en production.

## Prérequis

- Un compte marchand Orange Money Côte d'Ivoire et une application créée sur developer.orange.com avec l'API « Orange Money Web Payment » activée pour le pays CI.
- Trois valeurs tirées du portail : l'en-tête d'autorisation (Basic), la clé marchande et le code pays (ici `ci`).
- Laravel 11 ou 12, PHP 8.2 ou plus, l'extension `curl` active.
- Une URL publique en HTTPS pour la notification. En développement, le relais local d'Overpass rejoue les webhooks du simulateur sur votre poste.

## Installation

Aucun paquet tiers. Le client HTTP de Laravel suffit. Ajoutez dans `.env` :

```
OM_AUTH_HEADER="Basic xxxxxxxx"
OM_MERCHANT_KEY=xxxxxxxx
OM_COUNTRY=ci
OM_BASE=https://api.orange.com
```

## Paiement

Le jeton OAuth 2 s'obtient en `client_credentials` puis se met en cache. Il expire : lisez `expires_in` au lieu de supposer une durée.

```php
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

function omToken(): string
{
    return Cache::remember('om.token', now()->addMinutes(50), function () {
        $response = Http::withHeaders(['Authorization' => config('services.om.auth')])
            ->asForm()
            ->post(config('services.om.base') . '/oauth/v3/token', ['grant_type' => 'client_credentials'])
            ->throw()
            ->json();
        Cache::put('om.token', $response['access_token'], max(60, $response['expires_in'] - 60));
        return $response['access_token'];
    });
}

$payment = Http::withToken(omToken())
    ->post(config('services.om.base') . '/orange-money-webpay/ci/v1/webpayment', [
        'merchant_key' => config('services.om.merchant_key'),
        'currency' => app()->isProduction() ? 'XOF' : 'OUV',
        'order_id' => $order->reference,
        'amount' => (int) $order->total_xof,
        'return_url' => route('om.return'),
        'cancel_url' => route('om.cancel'),
        'notif_url' => route('om.notify'),
        'lang' => 'fr',
        'reference' => config('app.name'),
    ])
    ->throw()
    ->json();

$order->update(['om_pay_token' => $payment['pay_token'], 'om_notif_token' => $payment['notif_token']]);
return redirect()->away($payment['payment_url']);
```

## Webhook

Orange appelle `notif_url` en POST avec un corps JSON : `status`, `notif_token` et `txnid`. Le `notif_token` est le secret de cette commande : comparez-le à celui reçu à la création avant de croire au statut.

```php
Route::post('/webhooks/orange-money', function (Request $request) {
    $order = Order::where('om_notif_token', $request->input('notif_token'))->first();
    abort_if($order === null, 404);
    if ($request->input('status') === 'SUCCESS' && $order->paid_at === null) {
        $order->update(['paid_at' => now(), 'om_txnid' => $request->input('txnid')]);
    }
    return response()->noContent();
})->withoutMiddleware([\Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class]);
```

Avant de livrer, confirmez le statut côté serveur avec `POST /orange-money-webpay/ci/v1/transactionstatus` et les trois champs `order_id`, `amount`, `pay_token`. Le retour `SUCCESS` fait foi.

## Pièges connus

- Le bac à sable n'accepte pas `XOF` : la devise de test est `OUV`. Un `XOF` en sandbox renvoie une erreur de validation peu parlante.
- La notification peut arriver avant la redirection du client vers `return_url`, ou deux fois. Rendez le traitement idempotent et ne livrez jamais sur la seule `return_url`.
- Le `pay_token` et le `payment_url` ont une durée de vie courte (vécu : quelques minutes). Créez le paiement au moment du clic, pas à la création du panier.
- `order_id` doit être unique par marchand. Réutiliser une référence de commande après un échec renvoie une erreur.
- Les numéros ivoiriens ont dix chiffres depuis le 31 janvier 2021 (ARTCI). Un numéro à huit chiffres stocké avant cette date n'est plus valide.
- Le montant est un entier en francs CFA, sans décimales.
