---
title: "Encaisser un paiement CinetPay en Côte d'Ivoire depuis Symfony"
service: cinetpay
country: CI
stack: symfony
language: fr
---

Source : docs.cinetpay.com, API de paiement et notification, et le README du SDK PHP officiel 3.0.1 sur GitHub, consultés le 23 octobre 2026. La piste d'essai Overpass rejoue le flux du SDK PHP (connexion, paiement, lecture) ; en production, l'API HTTP décrite ici est celle que vous appelez.

## Prérequis

- Un compte marchand CinetPay avec un service créé : vous obtenez `apikey`, `site_id` et, dans les paramètres, une clé secrète pour vérifier les notifications.
- Symfony 7, PHP 8.2 ou plus, `symfony/http-client`.
- Une URL publique en HTTPS pour `notify_url`.

## Installation

```
composer require symfony/http-client
```

```
CINETPAY_API_KEY=xxxxxxxx
CINETPAY_SITE_ID=123456
CINETPAY_SECRET_KEY=xxxxxxxx
CINETPAY_BASE=https://api-checkout.cinetpay.com/v2
```

## Paiement

```php
final class CinetPayClient
{
    public function __construct(private HttpClientInterface $http, private string $apiKey, private string $siteId, private string $base) {}

    public function createPayment(Order $order, string $notifyUrl, string $returnUrl): array
    {
        $response = $this->http->request('POST', $this->base . '/payment', ['json' => [
            'apikey' => $this->apiKey,
            'site_id' => $this->siteId,
            'transaction_id' => $order->getReference(),
            'amount' => $order->getTotalXof(),
            'currency' => 'XOF',
            'description' => 'Commande ' . $order->getReference(),
            'notify_url' => $notifyUrl,
            'return_url' => $returnUrl,
            'channels' => 'ALL',
            'customer_name' => $order->getCustomerFirstName(),
            'customer_surname' => $order->getCustomerLastName(),
            'customer_phone_number' => $order->getCustomerPhone(),
            'customer_email' => $order->getCustomerEmail(),
        ]]);
        $body = $response->toArray(false);
        if (($body['code'] ?? null) !== '201') {
            throw new \RuntimeException($body['message'] ?? 'CinetPay a refusé le paiement');
        }
        return $body['data']; // payment_url, payment_token
    }
}
```

Redirigez le client vers `payment_url`.

## Webhook

CinetPay appelle `notify_url` en POST, corps `application/x-www-form-urlencoded`, avec `cpm_trans_id`, `cpm_site_id` et d'autres champs `cpm_*`. L'en-tête `x-token` porte un HMAC calculé avec votre clé secrète. La notification ne dit pas si le paiement est accepté : il faut relire la transaction.

```php
#[Route('/webhooks/cinetpay', methods: ['POST'])]
public function notify(Request $request, CinetPayClient $client): Response
{
    $transactionId = $request->request->get('cpm_trans_id');
    if ($transactionId === null) {
        return new Response(null, 400);
    }
    $check = $client->check($transactionId); // POST /payment/check {apikey, site_id, transaction_id}
    if (($check['data']['status'] ?? null) === 'ACCEPTED') {
        $this->orders->markPaid($transactionId, $check['data']);
    }
    return new Response(null, 204);
}
```

Désactivez la protection CSRF sur cette route et vérifiez `x-token` avec la clé secrète avant tout traitement si votre compte l'a activée.

## Pièges connus

- En XOF, le montant doit être un multiple de 5. `1 503` est refusé, `1 505` passe.
- La notification est un formulaire, pas du JSON. Avec Symfony, lisez `$request->request`, pas `$request->getContent()` décodé en JSON.
- La notification ne vaut pas confirmation : l'appel `/payment/check` est obligatoire, et son `status` vaut `ACCEPTED` ou `REFUSED`.
- `transaction_id` est unique par `site_id` pour toujours. Un identifiant réutilisé renvoie une erreur ; suffixez les nouveaux essais.
- Les champs `customer_*` sont obligatoires dès que le paiement par carte est possible (`channels` à `ALL` ou `CREDIT_CARD`).
- `return_url` peut être appelée en GET ou en POST selon le canal. Acceptez les deux.
- Les numéros ivoiriens ont dix chiffres ; `customer_phone_number` se passe sans indicatif avec `customer_phone_number` et `customer_country` cohérents.
