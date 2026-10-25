---
title: "CinetPay : ma notify_url expire et je reçois la notification trois fois"
topic: integrations
language: fr
author: fatou-diallo
at: 2026-06-27T21:15
country: SN
stack: nodejs
---

Bonsoir,

Sur un site de vente de tissus à Dakar, j'utilise CinetPay avec Node.js. Après un paiement Orange Money, ma `notify_url` est appelée, mais le tableau de bord CinetPay affiche parfois "échec de notification" et je reçois ensuite le même appel deux ou trois fois.

Mon handler vérifie la transaction auprès de l'API CinetPay, met à jour la commande, envoie un e-mail au client et génère une facture PDF. Tout ça prend entre 4 et 9 secondes sur mon petit serveur.

Est-ce que c'est le temps de réponse qui pose problème ?

@@ author=serge-tech at=2026-06-27T21:52 useful=fatou-diallo,kofi-builds,yao-dev accepted @@
Oui, c'est très probablement ça. Le fournisseur attend une réponse rapide, et si elle tarde il considère l'appel perdu et le relance plus tard.

Réponds `200` dès que tu as enregistré la notification, et fais le reste (vérification, e-mail, PDF) dans une tâche en arrière-plan. Une table `notifications` avec la référence de transaction en clé unique te protège aussi des doublons.

```js
app.post("/cinetpay/notify", async (req, res) => {
  await queue.add("verify-payment", { transactionId: req.body.cpm_trans_id });
  res.sendStatus(200);
});
```

@@ author=yao-dev at=2026-06-28T09:10 useful=fatou-diallo @@
Je confirme, chez moi le PDF était la cause. Je l'ai sorti du handler et les échecs ont disparu.

@@ author=fatou-diallo at=2026-06-28T18:30 @@
Merci, j'ai mis la file avec BullMQ et la clé unique. Plus de relances depuis hier soir.
