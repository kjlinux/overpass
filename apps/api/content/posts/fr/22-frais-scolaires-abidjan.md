---
title: "Une appli de frais de scolarité pour une école de Yopougon, du cahier au paiement"
kind: member
author: fanta-ci
category: portraits
language: fr
group: member-fanta-ecole
summary: "Le directeur notait les versements dans un cahier à spirale. Six mois après, les parents paient depuis leur téléphone et la comptable ne recopie plus rien. Récit complet, avec les erreurs."
publishedAt: 2026-10-05T07:50
stars: serge-tech, aminata-codes, ines-kouassi
cover: covers/22-frais-scolaires-abidjan.jpg
---

Je suis développeuse à Abidjan, et mon premier vrai client n'était pas une start-up. C'était l'école privée où a étudié mon petit frère, à Yopougon, deux cent quarante élèves du CP à la troisième.

## Le cahier

Les frais de scolarité se paient en trois tranches. Chaque famille passait à la comptabilité, donnait de l'argent liquide ou montrait un reçu de transfert, et la comptable écrivait la somme dans un cahier, puis recopiait le soir dans un tableur.

Les erreurs étaient normales. Un parent disait avoir payé 50 000 F CFA, le cahier disait 40 000, et personne ne pouvait trancher. Chaque fin de trimestre, trois jours entiers partaient dans le rapprochement.

## Ce que le directeur voulait

Il ne voulait pas une plateforme. Il voulait savoir, un matin, qui avait payé quoi, sans demander à personne. Et il voulait que les parents arrêtent de venir sur place juste pour verser de l'argent.

J'ai écrit ces deux phrases sur un papier et je l'ai collé au-dessus de mon écran. Chaque fois que j'avais une idée de fonction, je regardais le papier.

## La première version

Un tableau de familles, importé depuis son tableur. Chaque famille a un lien personnel, envoyé par SMS ou WhatsApp, qui ouvre une page avec le solde et un bouton pour payer. Le paiement passe par Orange Money ou Wave, selon le choix du parent.

Une fois le paiement confirmé, le solde de la famille est mis à jour et un reçu s'affiche, avec un numéro qui existe aussi dans le tableau de la comptable. Pour les parents qui préfèrent le liquide, la comptable saisit le versement dans la même interface, et il apparaît dans le même historique.

La stack est simple. Laravel, une base PostgreSQL, un petit serveur. Rien de plus compliqué que ce qu'une personne seule peut maintenir.

## Les erreurs

J'ai d'abord oublié que plusieurs enfants d'une même famille, c'est fréquent. Mon modèle liait un paiement à un élève. Les parents voulaient payer une fois pour deux enfants, et le montant se répartissait mal. J'ai dû tout refaire autour de la famille comme unité de compte, avec une répartition par élève calculée ensuite.

J'ai aussi sous-estimé les numéros de téléphone. Un parent paie avec le numéro de son frère, ou celui de la voisine, et mon rapprochement par numéro ne marchait plus. Le lien personnel règle cela, parce que c'est le lien, et non le numéro, qui identifie la famille.

Enfin, j'ai lancé sans mode de secours. Pendant une demi-journée, la confirmation d'un opérateur n'est pas arrivée, et trois parents avaient payé sans voir de reçu. J'ai ajouté un bouton « j'ai payé » qui crée une demande de vérification que la comptable traite le lendemain. Depuis, plus aucune famille n'est bloquée.

## Les résultats

Au premier trimestre, 61 % des familles ont payé par téléphone. Au deuxième, 78 %. Le rapprochement de fin de trimestre prend une heure au lieu de trois jours. La comptable m'a dit qu'elle avait retrouvé ses soirées.

Je facture l'école 35 000 F CFA par mois, et elle ne paie rien sur chaque transaction. Ce n'est pas le modèle le plus rentable du monde, mais j'ai un client fidèle et je sais que d'autres écoles du quartier me demandent déjà la même chose.

## Si vous voulez le faire

Parlez à la comptable avant de parler au directeur. C'est elle qui connaît les vraies exceptions, la famille qui paie en trois fois sur deux mois, l'enfant dont la tante règle une partie.

Et gardez un export en tableur dès le premier jour. Le jour où l'école vous dira qu'elle veut vérifier un chiffre, vous serez contente de pouvoir le lui montrer dans l'outil qu'elle connaît.

@@ author=serge-tech at=2026-10-05T09:30 likes=aminata-codes,ines-kouassi @@
Le papier collé au-dessus de l'écran, je fais pareil. La famille comme unité de compte plutôt que l'élève, c'est la leçon que tout le monde apprend après coup.

@@ author=ines-kouassi at=2026-10-05T11:48 @@
Merci, ça m'aide pour un projet de crèche. Les reçus numérotés, tu les génères côté serveur en PDF ou c'est juste une page ?

@@ author=fanta-ci at=2026-10-05T14:05 likes=ines-kouassi @@
Juste une page imprimable pour l'instant, avec le numéro de reçu en gros. Les parents font une capture d'écran, c'est ce qu'ils attendent. Le PDF viendra si l'école le demande.

@@ author=olu-codes at=2026-10-06T08:20 @@
Really nice. Even without speaking French fluently I could follow the story. The manual fallback button is the part I would steal.
