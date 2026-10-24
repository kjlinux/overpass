---
title: "Encaisser un paiement PayDunya en Côte d'Ivoire depuis Django"
service: paydunya
country: CI
stack: django
language: fr
---

Source : developers.paydunya.com, section Checkout Invoice et IPN, consultée le 23 octobre 2026. PayDunya accepte les marchands ivoiriens et encaisse Orange Money, MTN MoMo, Moov Money et Wave sur une seule facture.

## Prérequis

- Un compte PayDunya avec une boutique en Côte d'Ivoire ; quatre valeurs dans le tableau de bord : clé maître, clé privée, clé publique, jeton.
- Django 5, Python 3.11 ou plus, le paquet `requests`.
- Une URL publique en HTTPS pour l'IPN. En développement, le relais local d'Overpass rejoue l'IPN du simulateur sur votre poste.

## Installation

```
pip install requests
```

```python
# settings.py
PAYDUNYA = {
    "base": env("PAYDUNYA_BASE", default="https://app.paydunya.com/sandbox-api/v1"),
    "master_key": env("PAYDUNYA_MASTER_KEY"),
    "private_key": env("PAYDUNYA_PRIVATE_KEY"),
    "token": env("PAYDUNYA_TOKEN"),
}
```

## Paiement

```python
import requests
from django.conf import settings
from django.shortcuts import redirect
from django.urls import reverse

def paydunya_headers():
    cfg = settings.PAYDUNYA
    return {
        "PAYDUNYA-MASTER-KEY": cfg["master_key"],
        "PAYDUNYA-PRIVATE-KEY": cfg["private_key"],
        "PAYDUNYA-TOKEN": cfg["token"],
    }

def start_payment(request, order):
    payload = {
        "invoice": {"total_amount": order.total_xof, "description": f"Commande {order.reference}"},
        "store": {"name": "Boutique Overpass"},
        "actions": {
            "callback_url": request.build_absolute_uri(reverse("paydunya_ipn")),
            "return_url": request.build_absolute_uri(reverse("order_thanks", args=[order.pk])),
            "cancel_url": request.build_absolute_uri(reverse("order_detail", args=[order.pk])),
        },
        "custom_data": {"order_id": order.pk},
    }
    response = requests.post(
        f"{settings.PAYDUNYA['base']}/checkout-invoice/create",
        json=payload, headers=paydunya_headers(), timeout=15,
    )
    body = response.json()
    if body.get("response_code") != "00":
        raise RuntimeError(body.get("response_text", "PayDunya a refusé la facture"))
    order.paydunya_token = body["token"]
    order.save(update_fields=["paydunya_token"])
    return redirect(body["response_text"])
```

## Webhook

L'IPN arrive en formulaire encodé, avec des clés `data[status]`, `data[hash]`, `data[invoice][token]`. Django ne décode pas les crochets : lisez les clés telles quelles.

```python
import hashlib, hmac
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

@csrf_exempt
@require_POST
def paydunya_ipn(request):
    expected = hashlib.sha512(settings.PAYDUNYA["master_key"].encode()).hexdigest()
    if not hmac.compare_digest(expected, request.POST.get("data[hash]", "")):
        return HttpResponse(status=401)
    if request.POST.get("data[status]") == "completed":
        token = request.POST.get("data[invoice][token]")
        mark_paid(order_id=int(request.POST.get("data[custom_data][order_id]")), token=token)
    return HttpResponse(status=200)
```

Confirmez ensuite avec `GET /checkout-invoice/confirm/{token}` avant d'expédier.

## Pièges connus

- Sans `@csrf_exempt`, Django répond 403 à l'IPN et PayDunya marque la notification en échec.
- `request.POST["data"]` n'existe pas : les champs imbriqués restent sous la forme `data[invoice][token]`.
- Les montants de l'IPN peuvent être des chaînes. Convertissez avant de comparer au montant attendu.
- Clés `test_` sur `/sandbox-api/v1`, clés `live_` sur `/api/v1`. Mélanger les deux renvoie une erreur d'authentification.
- Le `hash` prouve l'origine, pas le paiement : lisez aussi `status`, et relisez la facture par l'API.
- Les numéros ivoiriens ont dix chiffres depuis 2021. Si vous préremplissez le numéro du client, validez sur dix chiffres, pas huit.
