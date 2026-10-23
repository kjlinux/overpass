---
title: "Encaisser Moov Money au Bénin en PHP : ce qu'il faut savoir avant de coder"
service: moov-money
country: BJ
stack: php
language: fr
---

Sources : rapport annuel 2025 de Maroc Telecom pour la présence de Moov Africa au Bénin, communiqué de l'ARCEP Bénin sur le passage à dix chiffres, documentation publique des agrégateurs cités, consultées le 23 octobre 2026. Moov Africa Bénin ne publie pas de documentation d'API ouverte : cette fiche dit ce qui marche en pratique.

## Prérequis

- Un contrat marchand Moov Money au Bénin, ou un compte chez un agrégateur qui encaisse Moov Money (PayDunya, CinetPay, FedaPay et KkiaPay le proposent au Bénin).
- PHP 8.1 ou plus.
- Pour l'API directe, un accès fourni par l'opérateur après signature : identifiants, adresse de la plateforme et documentation privée. Comptez plusieurs semaines.

## Installation

Avec un agrégateur, suivez sa fiche Overpass (PayDunya en PHP est documentée) et activez le canal Moov Money dans son tableau de bord. Rien de plus à installer.

## Paiement

Quel que soit le canal, un paiement Moov Money au Bénin suit le même déroulé : votre serveur envoie le montant et le numéro du client, le client reçoit une demande de confirmation (fenêtre USSD) sur son téléphone, saisit son code secret, et vous recevez le résultat quelques secondes à deux minutes plus tard.

```php
// Avec PayDunya : la facture est la même que pour les autres canaux,
// le client choisit Moov Money sur la page de paiement.
$payload = [
    'invoice' => ['total_amount' => 2500, 'description' => 'Commande 1042'],
    'store' => ['name' => 'Boutique Overpass'],
    'actions' => [
        'callback_url' => 'https://example.bj/paydunya/ipn',
        'return_url' => 'https://example.bj/commande/1042/merci',
        'cancel_url' => 'https://example.bj/commande/1042',
    ],
];
```

Validez le numéro avant d'envoyer : dix chiffres, préfixe `01`.

```php
function isBeninMobile(string $raw): bool
{
    $digits = preg_replace('/\D/', '', $raw);
    $digits = preg_replace('/^229/', '', $digits);
    return preg_match('/^01\d{8}$/', $digits) === 1;
}
```

## Webhook

Le résultat vous arrive par la notification de l'agrégateur, ou par le callback de l'API directe. Dans les deux cas :

- un paiement non confirmé par le client dans le délai renvoie un échec explicite, pas un silence ;
- relisez l'état par l'API avant de livrer ;
- traitez les doublons.

## Pièges connus

- Depuis le 30 novembre 2024, les numéros béninois ont dix chiffres : `01` suivi des huit anciens. Toute base clients antérieure doit être migrée, et toute validation sur huit chiffres refuse désormais des numéros valides.
- La fenêtre USSD de confirmation expire côté client. Affichez un compte à rebours et un bouton « renvoyer la demande » au lieu d'un simple sablier.
- Le solde du client n'est connu qu'au moment de la confirmation : un échec « solde insuffisant » est courant et n'est pas une erreur de votre code.
- L'API directe demande une adresse IP fixe déclarée chez l'opérateur (vécu). Prévoyez-la avant de demander l'accès.
- Aucun simulateur Moov Money n'existe dans Overpass pour l'instant : votez « Je veux un simulateur » sur la page du service si vous en avez besoin.
