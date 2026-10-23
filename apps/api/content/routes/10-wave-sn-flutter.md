---
title: "Payer avec Wave depuis une application Flutter au Sénégal"
service: wave
country: SN
stack: flutter
language: fr
---

Source : docs.wave.com, Checkout API, consultée le 23 octobre 2026, et les paquets `url_launcher` et `app_links` sur pub.dev. Le point clé : la clé API Wave ne quitte jamais votre serveur.

## Prérequis

- Un serveur qui crée les sessions Checkout (la fiche Laravel ou Node.js de ce service fait l'affaire) et expose deux routes à l'application : créer une session, lire son état.
- Flutter 3.24 ou plus, `url_launcher` et `app_links`.
- Un schéma d'URL ou un lien universel déclaré pour le retour dans l'application.

## Installation

```
flutter pub add url_launcher app_links http
```

Android : déclarez un `intent-filter` pour votre schéma de retour. iOS : ajoutez le schéma dans `CFBundleURLTypes` et, pour pouvoir tester la présence de l'application Wave, `wave` dans `LSApplicationQueriesSchemes`.

## Paiement

Le serveur crée la session avec `success_url` et `error_url` pointant vers votre schéma, par exemple `boutique://wave/ok?order=1042`.

```dart
Future<void> payWithWave(Order order) async {
  final response = await http.post(
    Uri.parse('$apiBase/orders/${order.id}/wave-session'),
    headers: {'authorization': 'Bearer $sessionToken'},
  );
  final session = jsonDecode(response.body) as Map<String, dynamic>;
  final launchUrl = Uri.parse(session['wave_launch_url'] as String);
  if (!await launchUrl(launchUrl, mode: LaunchMode.externalApplication)) {
    throw StateError('Impossible d\'ouvrir Wave');
  }
}
```

`wave_launch_url` ouvre l'application Wave si elle est installée, sinon une page web de paiement. Ne l'ouvrez pas dans une WebView intégrée : l'application Wave ne pourrait pas prendre le relais.

## Webhook

Le paiement est confirmé par le webhook reçu par votre serveur, jamais par le retour dans l'application. Au retour, l'application interroge le serveur jusqu'à ce que l'état change.

```dart
final appLinks = AppLinks();
appLinks.uriLinkStream.listen((uri) async {
  if (uri.host != 'wave') return;
  final orderId = uri.queryParameters['order'];
  for (var attempt = 0; attempt < 10; attempt++) {
    final state = await fetchOrderState(orderId);
    if (state == 'paid' || state == 'failed') return showResult(state);
    await Future<void>.delayed(const Duration(seconds: 2));
  }
  showResult('pending');
});
```

Côté serveur, l'état « payé » ne s'écrit qu'après vérification de la signature `Wave-Signature`.

## Pièges connus

- Le retour `success_url` arrive aussi quand le client annule puis revient : il ne prouve rien. Seul le webhook fait foi.
- Sur iOS, `canLaunchUrl` renvoie faux pour `https` vers Wave si le domaine n'est pas listé ; appelez `launchUrl` directement et traitez l'échec.
- Si l'utilisateur bascule vers Wave puis tue votre application, le lien de retour relance l'application à froid : traitez l'URI initiale (`getInitialLink`) en plus du flux.
- Une session expire au bout de trente minutes. Si l'utilisateur revient après, créez une nouvelle session plutôt que de rouvrir l'ancienne URL.
- Le montant est une chaîne sans décimales en XOF, formé côté serveur. L'application n'envoie jamais de montant.
- Les numéros sénégalais ont neuf chiffres ; Wave n'en a pas besoin pour Checkout, le client s'identifie dans son application.
