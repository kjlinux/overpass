---
title: "Encaisser un paiement PayDunya au Sénégal en PHP, sans framework"
service: paydunya
country: SN
stack: php
language: fr
---

Source : developers.paydunya.com, section Checkout Invoice et IPN, consultée le 23 octobre 2026. La piste d'essai Overpass rejoue la création, la confirmation et l'IPN.

## Prérequis

- Un compte PayDunya avec une boutique créée. Le tableau de bord donne quatre valeurs : clé maître, clé privée, clé publique, jeton. Les clés de test commencent par `test_`.
- PHP 8.1 ou plus avec `curl` et `json`.
- Une URL publique en HTTPS pour l'IPN.

## Installation

```
PAYDUNYA_MASTER_KEY=xxxx-xxxx-xxxx-xxxx-xxxx
PAYDUNYA_PRIVATE_KEY=test_private_xxxxxxxx
PAYDUNYA_TOKEN=xxxxxxxx
PAYDUNYA_BASE=https://app.paydunya.com/sandbox-api/v1
```

En production, la base devient `https://app.paydunya.com/api/v1` et les clés `live_`.

## Paiement

```php
function paydunyaHeaders(): array
{
    return [
        'Content-Type: application/json',
        'PAYDUNYA-MASTER-KEY: ' . getenv('PAYDUNYA_MASTER_KEY'),
        'PAYDUNYA-PRIVATE-KEY: ' . getenv('PAYDUNYA_PRIVATE_KEY'),
        'PAYDUNYA-TOKEN: ' . getenv('PAYDUNYA_TOKEN'),
    ];
}

$payload = [
    'invoice' => ['total_amount' => 1500, 'description' => 'Commande 1042'],
    'store' => ['name' => 'Boutique Overpass'],
    'actions' => [
        'callback_url' => 'https://example.sn/paydunya/ipn',
        'return_url' => 'https://example.sn/commande/1042/merci',
        'cancel_url' => 'https://example.sn/commande/1042',
    ],
    'custom_data' => ['order_id' => 1042],
];

$ch = curl_init(getenv('PAYDUNYA_BASE') . '/checkout-invoice/create');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => paydunyaHeaders(),
    CURLOPT_POSTFIELDS => json_encode($payload),
    CURLOPT_RETURNTRANSFER => true,
]);
$invoice = json_decode(curl_exec($ch), true);
if (($invoice['response_code'] ?? null) !== '00') {
    throw new RuntimeException($invoice['response_text'] ?? 'PayDunya a refusé la facture');
}
// response_text est l'URL de paiement, token identifie la facture.
header('Location: ' . $invoice['response_text']);
```

## Webhook

PayDunya envoie l'IPN en `application/x-www-form-urlencoded`, avec des champs imbriqués sous `data[...]`. Le champ `data[hash]` est le SHA-512 de votre clé maître : c'est votre preuve d'origine.

```php
$data = $_POST['data'] ?? [];
$expected = hash('sha512', getenv('PAYDUNYA_MASTER_KEY'));
if (!hash_equals($expected, $data['hash'] ?? '')) {
    http_response_code(401);
    exit;
}
if (($data['status'] ?? '') === 'completed') {
    markOrderPaid((int) $data['custom_data']['order_id'], $data['invoice']['token']);
}
http_response_code(200);
```

Avant de livrer, confirmez avec `GET /checkout-invoice/confirm/{token}` et les mêmes en-têtes : le statut `completed` dans la réponse fait foi.

## Pièges connus

- L'IPN n'est pas du JSON. `json_decode(file_get_contents('php://input'))` renvoie `null` ; lisez `$_POST['data']`.
- Les montants reviennent parfois sous forme de chaînes dans l'IPN (`"1500"`). Castez avant de comparer.
- Le `hash` prouve que l'appel vient de PayDunya, pas que la commande est payée : lisez aussi `status`.
- Le bac à sable et la production ont des bases différentes et des clés différentes. Une clé `test_` sur `/api/v1` renvoie une erreur d'authentification.
- Le même IPN peut arriver plusieurs fois ; `markOrderPaid` doit être idempotent.
- Les numéros sénégalais ont neuf chiffres ; PayDunya les demande sans indicatif pour le paiement par mobile money.
