# Overpass : cahier des charges

Oct 12, 2026 · @Jude

## 1. Résumé

Overpass est la bourse des intégrations africaines vérifiées : les développeurs y échangent ce que la documentation officielle ne dit pas.

Le produit répond au thème du Systalink Challenge, « Construire la plateforme d'échange africaine, pour les devs, par les devs ». Il repose sur trois briques.

- **Les itinéraires.** Des fiches d'intégration classées par service, pays et stack (Wave, Orange Money, MTN MoMo, SMS, USSD). Chaque fiche contient le code qui marche, les pièges connus et des vérifications datées par d'autres développeurs.
- **La piste d'essai.** Un simulateur qui rejoue les cas réels d'un paiement mobile money, pour tester une intégration en 30 secondes sans compte marchand.
- **Le serveur MCP.** Il sert les fiches aux assistants de code (Claude Code, Cursor, VS Code), pour que l'IA du développeur écrive la bonne intégration locale.

Autour de ce cœur, trois espaces font vivre la communauté au quotidien.

- **Les discussions.** Des sujets ouverts à tout ce qui occupe un développeur africain, au-delà des intégrations : carrière, outils, cloud, IA, projets.
- **Le blog.** Des articles d'actualité tech africaine, des tutoriels et des portraits, écrits par l'équipe et par des développeurs invités.
- **La newsletter.** Un résumé hebdomadaire des meilleures fiches, discussions et articles.

**Objectifs du produit**

| Objectif | Mesure le 25 octobre |
| --- | --- |
| Utile dès le premier utilisateur | Un paiement simulé de bout en bout sans inscription |
| Échange réel entre développeurs | Au moins 10 fiches publiées et 30 vérifications par des comptes distincts |
| Produit vendable | Parcours complet d'inscription, tableau de bord, page de tarifs |
| Confortable pour tous | Interface aérée, bilingue, utilisable au clavier et sur mobile en 3G |

**Équipe.** Ghostapi, Côte d'Ivoire : Jude Koffi et Bradi.

## 2. Contexte du concours et contraintes

Le projet doit être utilisable, hébergé en ligne et soumis avant le 25 octobre 2026 à 17 h GMT.

| Contrainte | Source | Conséquence pour Overpass |
| --- | --- | --- |
| Livrables : dépôt git et démo en ligne | Cockpit du challenge | Dépôt public soigné, démo accessible sans inscription |
| Un produit Systalink actif est obligatoire | Cockpit du challenge | Serveur cloud Datacloud (2 vCPU, 4 Go, 80 Go) et domaine .africa |
| Technologies open source uniquement | Règlement, rapporté par l'équipe | Stack sous licences permissives, aucun service propriétaire dans le produit |
| Équipe de 2 à 5 membres | Cockpit du challenge | Périmètre taillé pour deux développeurs |
| Classement par le public, les participants et le jury | [Page officielle CADev](https://systalink.com/fr/coupe-afrique-des-developpeurs-cadev) | Démo compréhensible en 30 secondes, usage réel avant le vote |

**Règles que l'équipe s'impose**

- Licences permissives seulement (MIT, Apache 2.0, BSD, ISC, licence PostgreSQL). Aucune dépendance GPL, AGPL ou LGPL, même indirecte, tant que le règlement n'a pas été relu sur ce point.
- Audit automatique des licences à chaque commit, rapport conservé dans le dépôt.
- Journal d'usage de l'IA tenu depuis le premier jour dans `docs/AI_USAGE.md`.
- Aucun code repris d'un projet client ou antérieur sans déclaration.
- Simulateurs écrits à partir de la documentation publique des opérateurs, sans leurs logos, avec la mention « non officiel ».

## 3. Utilisateurs et parcours

Overpass sert quatre profils, et chacun doit atteindre son but en moins de trois écrans.

| Profil | Ce qu'il vient chercher | Premier geste |
| --- | --- | --- |
| Le développeur pressé | Intégrer un paiement cette semaine | Chercher « Orange Money Côte d'Ivoire Laravel » et lancer un paiement simulé |
| Le contributeur | Partager ce qu'il a appris en production | Publier une fiche ou confirmer qu'une fiche fonctionne encore |
| Le développeur assisté par IA | Que son assistant écrive le bon code | Brancher le serveur MCP avec un jeton personnel |
| Le visiteur (jury, public) | Comprendre le produit sans compte | Ouvrir la démo et voir un paiement simulé aboutir |

**Parcours clés**

1. **Découvrir.** Accueil, puis démo sans inscription : choisir un opérateur, lancer un paiement simulé, voir la requête, la réponse et le webhook.
2. **S'inscrire.** E-mail et mot de passe, puis pays et stacks utilisées. Trois champs, une seule étape.
3. **Trouver.** Recherche par service, pays et stack. La fiche affiche son état : « voie libre », « à vérifier » ou « signalée cassée ».
4. **Tester.** Depuis la fiche, ouvrir la piste d'essai avec le scénario pré-rempli.
5. **Contribuer.** Vérifier une fiche en un clic, signaler un piège, ou publier une nouvelle fiche à partir d'un modèle.
6. **Brancher son IA.** Créer un jeton, copier la configuration, poser la question à son assistant.

**Vocabulaire du produit**

| Terme affiché | Sens |
| --- | --- |
| Itinéraire | Fiche d'intégration |
| Nid-de-poule | Piège signalé sur une intégration |
| Voie libre | Intégration vérifiée récemment |
| Piste d'essai | Simulateur |

## 4. Périmètre fonctionnel

Le périmètre tient en dix modules, dont quatre sont indispensables à la soumission, complétés par les ajouts décidés le 13 octobre 2026 décrits plus bas.

| Module | Priorité | Contenu |
| --- | --- | --- |
| Comptes | P0 | Inscription, connexion, mot de passe oublié, profil public avec pays et stacks, choix de la langue |
| Itinéraires | P0 | Création à partir d'un modèle, édition en Markdown avec blocs de code, recherche et filtres (service, pays, stack, état), versions |
| Vérifications | P0 | Bouton « ça marche chez moi » daté par pays, signalement d'un piège, calcul de l'état de la fiche selon la fraîcheur |
| Piste d'essai | P0 | Clés de test, scénarios rejouables, inspecteur de requêtes, envoi de webhooks vers une URL fournie ou un récepteur intégré |
| Discussions | P1 | Sujets classés par thème, réponses, vote « utile », réponse acceptée par l'auteur, étiquettes pays et stack, lien possible vers une fiche |
| Blog | P1 | Articles bilingues en Markdown, catégories, brouillon puis publication, auteur invité, flux RSS |
| Newsletter | P1 | Inscription avec confirmation par e-mail, choix de la langue, numéro hebdomadaire, désinscription en un clic |
| Classement | P1 | Points par contribution, classement par pays et par développeur |
| Serveur MCP | P1 | Outils en lecture seule : chercher une fiche, la lire, lister les pièges |
| Administration | P1 | Modération des fiches, des sujets et des signalements, rédaction des articles, suspension d'un compte |

**Scénarios de la piste d'essai (P0)**

- Paiement réussi
- Solde insuffisant
- Délai dépassé côté opérateur
- Webhook reçu en double
- Webhook reçu en retard

Opérateurs simulés, dans cet ordre : Wave, PI-SPI (le système de paiement instantané de la BCEAO), PayDunya, puis CinetPay. CinetPay, reporté le 14 octobre 2026 parce que docs.cinetpay.com ne répond plus, revient le 20 octobre 2026 : son SDK PHP officiel 3.0.1 (11 août 2026) décrit en prose, dans son README, la nouvelle API REST, et qualifie les API V1 et V2 de legacy. Le simulateur suit ce seul README, jamais le code du SDK ; les points qu'il ne précise pas (chemins de connexion et de création, noms JSON, forme de la notification, corps des refus) sont des choix du simulateur, listés dans ses notes, et un avertissement le rappelle avant tout essai. Orange Money et Moov Money n'ont pas de simulateur, faute de documentation technique publique, mais ils gardent leurs fiches d'intégration. PayDunya suit sa seule page HTTP/JSON, sans version : les points qu'elle ne précise pas (codes d'erreur, encodage de l'IPN, entrée du hash) sont des choix du simulateur, listés dans ses notes (décision du 15 octobre 2026).

Documentations suivies, consultées le 12 octobre 2026 : [Wave Checkout API](https://docs.wave.com/checkout), [PI-SPI](https://developer.pispi.bceao.int), [PayDunya](https://developers.paydunya.com/doc/FR/http_json), et pour CinetPay, consulté le 20 octobre 2026, le [README du SDK PHP officiel](https://github.com/cinetpay/cinetpay-php-sdk). La page [Orange Money Web Payment](https://developer.orange.com/apis/om-webpay) réserve l'accès technique aux marchands inscrits.

**Règles de gestion**

- Une fiche est « voie libre » si elle compte au moins deux vérifications de comptes distincts dans les 90 derniers jours.
- Elle passe « à vérifier » sans vérification récente, et « signalée cassée » dès deux signalements non résolus.
- Un compte ne peut vérifier une même fiche qu'une fois par période de 30 jours.
- Points : fiche publiée 10, vérification 2, piège confirmé par l'auteur 5.

**Thèmes de discussion au lancement**

- Intégrations et API
- Cloud et déploiement
- Outils et IA
- Carrière et freelance
- Projets et entraide
- Événements et communautés

**Règles des discussions, du blog et de la newsletter**

- Les intégrations restent le produit phare : l'accueil met la piste d'essai et les fiches en premier, les discussions et le blog ensuite.
- Quand une discussion aboutit à une solution d'intégration, son auteur peut la transformer en fiche en un clic.
- Points : réponse acceptée 5, réponse jugée utile 1, article publié 10.
- Tout sujet ou réponse peut être signalé. Deux signalements le masquent jusqu'à la décision d'un modérateur.
- Un article passe par un brouillon et une relecture de l'équipe avant publication.
- La newsletter n'est envoyée qu'aux adresses confirmées, et chaque numéro porte un lien de désinscription.

**Ajouts décidés le 13 octobre 2026**

**1. Relais local des webhooks (P0).** Recevoir un callback exige d'habitude une URL publique en HTTPS, ce qui bloque quiconque développe sur son poste. Overpass fournit une commande, du type « npx overpass listen --forward-to http://localhost:3000/webhook », qui ouvre une connexion sortante vers Overpass et rejoue chaque webhook simulé sur le serveur local du développeur. Aucun tunnel, aucun certificat, aucune ouverture de port. Le relais transmet le corps et les en-têtes sans les modifier, pour que la vérification de signature fonctionne comme en production. L'inspecteur montre chaque livraison : envoyée, reçue en local, code de réponse, durée, bouton Rejouer. La commande s'authentifie avec une clé de test et ne reçoit que les webhooks de cette clé. Elle vit dans apps/cli, sous licence MIT.

**2. Relais des callbacks réels (P1, bêta).** Overpass attribue au développeur une URL publique en HTTPS à déclarer chez l'opérateur réel. Les callbacks reçus sont rejoués sur son poste par la même commande. Limites : usage de développement uniquement, quotas stricts, rien n'est conservé au-delà de 24 heures, mention claire que des données de paiement réelles transitent par Overpass.

**3. Démo guidée PI-SPI (P0 si PI-SPI est livré).** Un parcours pas à pas dans la piste d'essai : obtenir un jeton, créer une demande de paiement, la voir payée, recevoir le webhook sur son poste local. Chaque étape affiche la requête à copier et la réponse obtenue. Le simulateur complète le sandbox officiel de la BCEAO avec les scénarios d'échec et un accès sans certificat, et renvoie vers lui.

**4. Actualités, blogs des membres et abonnements (P1).** Les actualités sont une rubrique tenue par l'administration seule. Chaque membre dispose de son blog, à une adresse du type /blog/@pseudo, et y publie ses articles en Markdown, sans relecture préalable. Tout membre connecté peut commenter un article et lui donner une étoile, une par compte et par article. Un membre peut suivre un auteur : son fil « Pour moi » affiche d'abord les articles des auteurs suivis, puis les articles récents les mieux notés. L'administration peut masquer ou bloquer un article ou un commentaire et suspendre un blog. Deux signalements masquent un contenu en attendant une décision. Tables ajoutées : follows, post_comments, post_stars. Le fil est une requête PostgreSQL, sans base en graphe. Points : étoile reçue 1.

**5. Entraide autour des API (P1).** Les fiches et les questions viennent des membres, l'équipe ne code que les opérateurs simulés. Sur une fiche, un bouton « Ça ne marche pas chez moi » ouvre une discussion déjà rattachée à la fiche, au service et au pays. Le formulaire de question a un champ pour le message d'erreur et un pour le code, et masque avant publication les clés, jetons et secrets collés par mégarde. Un membre peut proposer un service absent de la liste, que l'administration valide. Sur un service sans simulateur, un bouton « Je veux un simulateur » permet un vote par compte, avec un classement public des demandes.

**6. Assistant « Demande à Overpass » (P2, optionnel).** Construit seulement si tout le reste est en ligne le 21 octobre. Il cherche dans les fiches, les discussions et les articles, puis répond en citant chaque source avec son lien et l'état de la fiche. Sans source pertinente, il dit qu'il ne sait pas. Modèle ouvert sous licence permissive, hébergé sur un serveur GPU Systalink, sans API d'IA propriétaire. VoltAgent orchestre la recherche et la réponse. Les contenus lus sont des données, jamais des instructions.

**Règles de couverture des opérateurs (13 octobre 2026)**

- Seuls les pays confirmés d'un opérateur sont affichés, chacun avec sa source et sa date de consultation.
- Un pays non confirmé devient confirmé dès qu'une fiche de ce service dans ce pays atteint l'état « voie libre ». Ce sont les membres qui complètent la carte.

**Hors périmètre de la première version**

- Paiements réels et facturation en ligne (la page de tarifs présente les offres, sans encaissement).
- Messagerie privée, offres d'emploi.
- Application mobile native (le site est responsive et installable).
- Outils MCP en écriture.

## 5. Pages et écrans

Le produit compte 24 écrans, répartis entre un site public qui vend et un espace connecté qui sert.

**Site public**

| Page | Rôle | Contenu obligatoire |
| --- | --- | --- |
| Accueil | Convaincre en 10 secondes | Promesse, bouton « Essayer la démo », les trois briques, carte des pays couverts, chiffres d'usage réels, appel à l'inscription |
| Démo | Montrer sans compte | Piste d'essai limitée à un opérateur et trois scénarios |
| Catalogue | Explorer | Recherche, filtres, cartes de fiches avec état et pays |
| Détail d'une fiche | Lire et agir | Contenu, pièges, vérifications datées, bouton « Tester », bouton « Vérifier » |
| Classement | Créer l'émulation | Pays, puis développeurs |
| Tarifs | Rendre le produit vendable | Offre gratuite, offre Équipe, offre Entreprise, mention « bientôt » sur le paiement |
| Documentation | Brancher le MCP et l'API | Démarrage rapide, configuration par éditeur, référence de l'API |
| À propos, mentions légales, confidentialité | Rassurer | Équipe, licences, traitement des données |
| Erreur 404 et erreur serveur | Ne jamais perdre l'utilisateur | Message clair, retour à l'accueil |

**Communauté et contenus**

| Page | Rôle | Contenu obligatoire |
| --- | --- | --- |
| Discussions | Parler de tout ce qui touche au métier | Liste des sujets, filtres par thème, pays et stack, bouton « Nouveau sujet » |
| Détail d'un sujet | Répondre et aider | Message d'origine, réponses, vote « utile », réponse acceptée, bouton « Transformer en fiche » |
| Blog | Suivre l'actualité | Articles récents, catégories, article à la une |
| Article | Lire confortablement | Texte sur une colonne étroite, auteur, date, articles liés, inscription à la newsletter en fin de page |
| Newsletter | S'abonner et se désabonner | Champ e-mail et langue, page de confirmation, page de désinscription |
| Éditeur d'article (administration) | Publier | Brouillon, aperçu, version française et anglaise, date de publication |

L'inscription à la newsletter apparaît aussi dans le pied de page et à la fin de l'inscription, case décochée par défaut.

**Comptes**

| Page | Contenu obligatoire |
| --- | --- |
| Inscription | E-mail, mot de passe, pays, puis confirmation par un lien envoyé par e-mail. Stacks demandées à l'écran suivant, facultatives |
| Connexion | E-mail, mot de passe, lien « mot de passe oublié » |
| Mot de passe oublié et réinitialisation | Un champ par écran, confirmation explicite |

**Espace connecté**

| Page | Contenu obligatoire |
| --- | --- |
| Tableau de bord | Mes fiches, mes vérifications, mes points, raccourci vers la piste d'essai |
| Éditeur de fiche | Modèle pré-rempli, aperçu en direct, choix de la langue de la fiche |
| Piste d'essai | Opérateur, scénario, clés de test, inspecteur, journal des webhooks |
| Profil public | Pays, stacks, contributions, points |
| Paramètres | Langue, mot de passe, jetons MCP et clés d'API, suppression du compte |
| Administration | File de modération, signalements, comptes |

**Éléments communs.** En-tête avec sélecteur de langue, pied de page, états vides illustrés, messages d'erreur rédigés, confirmations avant toute action destructive.

## 6. Design et expérience utilisateur

L'interface doit paraître calme, lisible et professionnelle : un développeur débutant comme un membre du jury doit s'y sentir à l'aise dès la première minute.

**Principes**

- **Aéré.** Une idée par écran, une action principale par écran. Largeur de lecture limitée à 72 caractères pour les fiches.
- **Lisible.** Texte courant à 16 px minimum, interligne 1,6, contraste conforme au niveau AA des règles d'accessibilité.
- **Prévisible.** Mêmes composants partout, mêmes emplacements pour les mêmes actions.
- **Rassurant.** Chaque action donne un retour visible. Les erreurs disent quoi faire ensuite.
- **Sobre.** Une seule couleur d'accent, pas de dégradé décoratif, pas d'émoji en guise d'icône.

**Système de design**

| Élément | Règle |
| --- | --- |
| Fichier de référence | Un `DESIGN.md` propre à Overpass à la racine du dépôt, seule source de vérité visuelle |
| Espacement | Échelle de 4 px (4, 8, 12, 16, 24, 32, 48, 64, 96). Marge verticale de 96 px entre sections de l'accueil |
| Couleurs | Thème sombre par défaut, thème clair disponible. Rôles nommés : fond, surface, texte, accent, succès, alerte, danger |
| Typographie | Deux familles sous licence libre : une pour les titres et le texte, une à chasse fixe pour le code |
| Composants | Bouton, champ, carte, badge d'état, tableau, onglets, fenêtre de confirmation, notification, bloc de code avec copie |
| Icônes | Un seul jeu d'icônes sous licence permissive |
| Mouvement | Transitions de 150 à 250 ms, désactivées si l'utilisateur demande moins d'animations |

**Confort d'usage**

- Mobile d'abord : tout parcours P0 est faisable sur un écran de 360 px de large.
- Navigation complète au clavier, focus visible, libellés sur tous les champs.
- Zones tactiles de 44 px minimum.
- États de chargement en squelette, jamais d'écran blanc.
- Formulaires courts : validation au fil de la saisie, messages placés sous le champ concerné.
- Aucun texte figé dans une image, pour rester traduisible.

**Méthode.** Le `DESIGN.md` est rédigé avant le premier écran, à partir d'une base du catalogue awesome-design-md (voir section 12). Chaque page est ensuite auditée avant d'être fusionnée.

## 7. Exigences non fonctionnelles

L'application doit pouvoir grandir sans réécriture : plus d'utilisateurs, plus d'opérateurs, plus de langues.

| Exigence | Cible | Moyen |
| --- | --- | --- |
| Scalabilité | Passer d'un serveur à plusieurs sans changer le code | API sans état, sessions par jeton, compteurs de limitation de débit dans PostgreSQL, fichiers hors du disque local, tâches longues en file d'attente |
| Évolutivité | Ajouter un opérateur en un dossier, sans toucher au cœur | Architecture en modules, opérateurs du simulateur sous forme d'adaptateurs au contrat commun |
| Bilingue | Français et anglais partout | Aucune chaîne en dur, fichiers de traduction par module, langue détectée puis mémorisée, URL préfixées `/fr` et `/en` |
| Contenu bilingue | Une fiche peut exister dans les deux langues | Champ de langue sur la fiche, lien entre traductions, repli sur la langue disponible |
| Performance | Page utile en moins de 3 secondes en 3G | Page d'accueil sous 200 Ko hors polices, images différées, pagination côté serveur |
| Disponibilité | Démo stable pendant le vote | Sauvegarde quotidienne de la base, redémarrage automatique, page d'état |
| Sécurité | Aucun secret exposé, aucun abus du simulateur | Mots de passe hachés (Argon2), limitation de débit, validation de toutes les entrées, jetons révocables affichés une seule fois |
| Données personnelles | Minimum collecté | E-mail, pays, stacks. Suppression du compte en libre-service |
| Accessibilité | Niveau AA | Contrôle automatique en intégration continue et revue manuelle au clavier |
| Observabilité | Savoir ce qui casse | Journaux structurés, identifiant de requête, compteur d'erreurs |

**Sécurité des comptes**

- Requêtes forgées depuis un autre site : cookie de session `httpOnly`, `SameSite=Lax`, préfixé `__Host-` et `Secure` en production ; toute requête qui modifie des données est refusée si son en-tête `Origin` n'est pas celui du site, ou s'il manque alors qu'un cookie est présent ; seuls les corps JSON sont acceptés.
- L'inscription répond toujours de la même façon : une adresse déjà inscrite reçoit un rappel de connexion au lieu du lien de confirmation, sans que l'écran le révèle.
- La limitation de débit compte par adresse IP sur toutes les routes d'authentification, et par adresse e-mail sur l'inscription et le mot de passe oublié. Les compteurs vivent dans PostgreSQL, partagés par toutes les instances de l'API.

**Risque accepté (revue de sécurité du module comptes)**

- Faible : un tiers peut épuiser les trois demandes de réinitialisation par adresse et par quart d'heure d'une victime, qui doit alors attendre quinze minutes. Non corrigé : cette limite par adresse est précisément ce qui empêche d'inonder une boîte de réception de liens, et ne compter que les adresses existantes révélerait quels comptes existent. La gêne est courte, ne donne aucun accès, et la limite par IP freine celui qui la provoque.

**Sécurité propre au simulateur**

- Les webhooks sortants ne visent jamais une adresse privée ou locale du serveur.
- Quota de requêtes par clé de test et par adresse IP.
- Les contenus des fiches lus par un assistant IA sont des données, jamais des instructions : le serveur MCP les renvoie balisés comme tels.

**Newsletter et e-mails**

- Double confirmation : une adresse ne reçoit rien tant que son lien de confirmation n'a pas été cliqué.
- Désinscription en un clic, sans connexion, effective immédiatement.
- Envoi par SMTP, en file d'attente, par lots, pour protéger la réputation du domaine.
- Les contenus publiés par les membres sont nettoyés avant affichage, pour bloquer toute injection de script.

**Ajouter une langue plus tard.** Un fichier de traduction par module et une entrée dans la liste des langues suffisent. Aucun composant ne doit supposer deux langues.

## 8. Architecture et stack technique

Overpass est un monolithe modulaire en TypeScript : trois services légers derrière un proxy, une seule base PostgreSQL, le tout sur un serveur cloud Datacloud.

&#91;embedded content: architecture · 3 services, 1 base, 1 worker\]

Le navigateur et l'assistant de code entrent par Caddy. Le serveur MCP ne lit jamais la base : il passe par l'API. Le worker prend ses tâches dans PostgreSQL et envoie les webhooks simulés vers l'application du développeur.

**Stack retenue**

| Couche | Choix | Licence |
| --- | --- | --- |
| Langage et exécution | TypeScript 6.0, Node.js 22 LTS | Apache 2.0, MIT |
| Interface | Preact 11 (API de React, via @preact/compat pour react-i18next), preact-iso pour le routage, Vite 7.3.7, Tailwind CSS 3.4.19 avec PostCSS | MIT |
| Traductions | i18next | MIT |
| Icônes et polices | lucide-preact (jeu Lucide), IBM Plex Sans et IBM Plex Mono auto-hébergées | ISC, SIL OFL 1.1 |
| API | Fastify, validation par Zod | MIT |
| Accès aux données | Drizzle ORM, node-postgres | Apache 2.0, MIT |
| Base de données | PostgreSQL, recherche plein texte native | Licence PostgreSQL |
| File d'attente | Table `sandbox_deliveries` lue avec `FOR UPDATE SKIP LOCKED`, diffusion par `LISTEN/NOTIFY` | Licence PostgreSQL |
| Serveur MCP | SDK officiel TypeScript | MIT |
| Tests | Vitest 5, Playwright | MIT, Apache 2.0 |
| Proxy et HTTPS | Caddy | Apache 2.0 |
| Déploiement | Docker Compose | Apache 2.0 |

Les licences sont vérifiées par l'audit automatique, dépendances indirectes comprises (rapport dans `docs/LICENSES.md`). Les versions exactes sont figées dans le fichier de verrouillage.

**Versions retenues le 12 octobre 2026**

- Vite 8 et Tailwind CSS 4 dépendent de lightningcss, publié sous MPL-2.0, hors de notre liste blanche. L'interface reste donc sur Vite 7.3.7, maintenu, et Tailwind CSS 3.4.19 compilé par PostCSS.
- Le plugin React classique de Vite passe par Babel, qui tire caniuse-lite sous CC-BY-4.0. Aucun plugin n'est nécessaire : Vite compile le JSX de Preact avec son esbuild intégré. Contrepartie : pas de rafraîchissement à chaud des composants, la page se recharge à chaque modification.
- Preact remplace React pour tenir le budget de l'accueil : moins de 80 Ko de JavaScript compressé pour la page vide, contrôlé automatiquement par `npm run check:budget`. React DOM pèse à lui seul 65 Ko compressés ; la page vide passe de 98,6 Ko avec React à 29,8 Ko avec Preact. React Router 8 ne fonctionne pas avec Preact, d'où preact-iso. Les paquets `react` et `react-dom` sont redirigés vers @preact/compat dans tout le dépôt.
- TypeScript reste en 6.0 : typescript-eslint ne prend pas encore en charge TypeScript 7.
- Tailwind CSS 3 tire des outils de build signalés par `npm audit` (braces, postcss-selector-parser). Ils ne traitent que nos propres sources et ne partent pas dans le navigateur ; les dépendances de production n'ont aucune alerte. À revoir si lightningcss change de licence.
- Décision du 20 octobre 2026 : Tailwind CSS 3 est conservé malgré ces alertes, qui ne touchent que les outils de développement. Alertes concernées : [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) (braces, sévérité haute, déni de service par motifs imbriqués, tiré par chokidar, micromatch et fast-glob) et [GHSA-rj75-hqrm-r3gf](https://github.com/advisories/GHSA-rj75-hqrm-r3gf) (postcss-selector-parser, sévérité modérée, complexité quadratique). La seule correction proposée par `npm audit` est Tailwind CSS 4, exclu par la licence de lightningcss.

**Pourquoi ces choix**

- Un seul langage pour l'interface, l'API et le serveur MCP : deux développeurs peuvent tout relire.
- PostgreSQL porte aussi la recherche et la file d'attente : aucun autre service à exploiter au lancement.
- Chaque service est sans état, donc duplicable derrière le proxy le jour où le trafic l'exige.

**Organisation du dépôt**

```
overpass/
  apps/
    web/          interface Preact
    api/          API Fastify, un dossier par module
    mcp/          serveur MCP
  packages/
    shared/       schémas Zod, types, clés de traduction
    simulator/    moteur de scénarios, contrat des opérateurs
    providers/    un dossier par opérateur simulé
  docs/           cahier des charges, API, AI_USAGE.md, LICENSES.md
  DESIGN.md
  CLAUDE.md
```

**Modules de l'API.** `accounts`, `routes` (les itinéraires), `checks` (vérifications et pièges), `sandbox` (piste d'essai), `ranking`, `admin`. Chaque module expose ses routes, son service et son accès aux données, et n'importe rien d'un autre module en dehors de son interface publique.

Trois modules s'ajoutent pour la communauté : `discussions`, `blog` et `newsletter`. Les e-mails partent par SMTP avec Nodemailer (MIT), depuis le service Email Pro de Systalink ou un serveur de messagerie libre. Aucun service d'envoi propriétaire.

**Chemin d'évolution**

1. Aujourd'hui : un serveur, tous les services en conteneurs.
2. Trafic en hausse : base de données managée, deux instances de l'API derrière le proxy.
3. Au-delà : worker de webhooks sur sa propre machine, cache en lecture pour le catalogue.

## 9. Modèle de données

Ces tables suffisent à la première version : chacune appartient à un seul module, sauf les compteurs de limitation de débit, partagés par l'infrastructure de l'API.

| Table | Module | Champs principaux |
| --- | --- | --- |
| `users` | accounts | e-mail, mot de passe haché, nom public, pays, langue, rôle, version de session, date du consentement newsletter, date de création |
| `user_stacks` | accounts | utilisateur, stack |
| `services` | routes | identifiant court, nom, catégorie (paiement, SMS, USSD), opérateur simulé ou non |
| `service_countries` | routes | service, pays, confirmé, base (source ou communauté), source, date de consultation, fiche qui a confirmé, date de confirmation |
| `routes` | routes | auteur, service, pays, stack, langue, titre, contenu Markdown, version, groupe de traduction, date de suppression |
| `route_versions` | routes | fiche, numéro, titre, contenu, auteur, date |
| `checks` | checks | fiche, utilisateur, pays, environnement (test ou production), date |
| `potholes` | checks | fiche, utilisateur, description, statut (ouvert, confirmé, résolu), date |
| `sandbox_keys` | sandbox | utilisateur, opérateur, clé hachée, quota, date d'expiration |
| `sandbox_events` | sandbox | clé, scénario, requête, réponse, webhooks envoyés, date |
| `sandbox_objects` | sandbox | clé, opérateur, type (session, demande de paiement), identifiant, état, date |
| `sandbox_deliveries` | sandbox | clé, événement, cible (URL, relais local, récepteur intégré), corps brut, en-têtes, tentatives, prochaine tentative, code de réponse, durée, état |
| `api_tokens` | accounts | utilisateur, nom, usage (MCP ou API), jeton haché, dernière utilisation, date de révocation |
| `rate_limit_counters` | infrastructure | clé (route et adresse), nombre de requêtes, fin de la fenêtre |

| Table | Module | Champs principaux |
| --- | --- | --- |
| `topics` | discussions | nom, description, ordre, traductions |
| `threads` | discussions | auteur, thème, titre, contenu Markdown, langue, pays, stack, fiche liée, réponse acceptée, statut |
| `replies` | discussions | sujet, auteur, contenu, nombre de votes « utile », statut |
| `posts` | blog | auteur, titre, résumé, contenu Markdown, langue, catégorie, statut (brouillon, publié), date de publication, lien vers la traduction |
| `newsletter_subscribers` | newsletter | e-mail, langue, jeton de confirmation, date de confirmation, date de désinscription |
| `newsletter_issues` | newsletter | numéro, langue, objet, contenu, date d'envoi, nombre de destinataires |

**Règles**

- Identifiants en UUID, dates en UTC, suppression logique pour les fiches.
- Les points du classement sont calculés à partir de `routes`, `checks` et `potholes`, puis mis en cache. Ils ne sont jamais saisis.
- L'état d'une fiche (voie libre, à vérifier, signalée cassée) n'est pas stocké : il est calculé à chaque lecture à partir de `checks` et `potholes`. Les versions française et anglaise d'une fiche partagent un groupe de traduction, une seule fiche par langue.
- Les événements de la piste d'essai sont purgés après 7 jours.
- Chaque migration est versionnée et réversible.

## 10. API, simulateur et serveur MCP

L'API REST est le seul point d'accès aux données : l'interface, le serveur MCP et les intégrations tierces passent tous par elle.

**Conventions de l'API**

- Préfixe `/v1`, JSON, réponses enveloppées `{ data, error }`.
- Erreurs avec un code stable et un message traduit selon l'en-tête de langue.
- Pagination par curseur, 20 éléments par défaut.
- Spécification OpenAPI générée depuis les schémas Zod et publiée dans la documentation.

| Ressource | Routes principales |
| --- | --- |
| Comptes | `POST /v1/auth/register`, `POST /v1/auth/login`, `POST /v1/auth/logout`, `POST /v1/auth/forgot`, `POST /v1/auth/reset`, `GET` et `PATCH /v1/me`, `PUT /v1/me/password`, `DELETE /v1/me`, `GET /v1/users/:handle` |
| Fiches | `GET /v1/services`, `GET /v1/routes`, `GET /v1/routes/:id`, `POST /v1/routes`, `PATCH /v1/routes/:id`, `DELETE /v1/routes/:id`, `GET /v1/me/routes` |
| Vérifications | `POST /v1/routes/:id/checks`, `POST /v1/routes/:id/potholes`, `PATCH /v1/potholes/:id`, `GET /v1/me/checks` |
| Piste d'essai | `POST /v1/sandbox/keys`, `GET /v1/sandbox/events`, `GET /v1/sandbox/listen`, `POST /v1/sandbox/deliveries/:id/replay`, toutes méthodes sur `/v1/sandbox/:provider/*` (réponses au format de l'opérateur, hors enveloppe) |
| Classement | `GET /v1/ranking/countries`, `GET /v1/ranking/developers` |
| Jetons | `GET /v1/tokens`, `POST /v1/tokens`, `DELETE /v1/tokens/:id` |

| Ressource | Routes principales |
| --- | --- |
| Discussions | `GET /v1/threads`, `POST /v1/threads`, `GET /v1/threads/:id`, `POST /v1/threads/:id/replies`, `POST /v1/replies/:id/useful`, `POST /v1/threads/:id/accept` |
| Blog | `GET /v1/posts`, `GET /v1/posts/:slug`, `POST /v1/posts`, `PATCH /v1/posts/:id`, `GET /v1/posts/feed.xml` |
| Newsletter | `POST /v1/newsletter/subscribe`, `GET /v1/newsletter/confirm`, `GET /v1/newsletter/unsubscribe`, `POST /v1/newsletter/issues` |

**Contrat d'un opérateur simulé**

Chaque opérateur est un dossier dans `packages/providers/` qui fournit quatre éléments :

1. la liste de ses points d'entrée, calqués sur la documentation publique de l'opérateur ;
2. la réponse à produire pour chaque scénario ;
3. la forme et la signature de ses webhooks ;
4. une fiche d'identité : nom, pays, version de la documentation suivie, mention « non officiel ».

Le moteur du simulateur ne connaît aucun opérateur. Ajouter un opérateur ne modifie ni l'API ni l'interface.

**Outils du serveur MCP (lecture seule)**

| Outil | Entrée | Sortie |
| --- | --- | --- |
| `search_routes` | service, pays, stack, langue | Liste de fiches avec leur état |
| `get_route` | identifiant | Contenu de la fiche, date de dernière vérification |
| `list_potholes` | identifiant ou service et pays | Pièges ouverts et confirmés |
| `list_services` | pays facultatif | Services et pays couverts |

Le serveur MCP s'authentifie avec un jeton personnel créé dans les paramètres. Il n'embarque aucun modèle d'IA : c'est l'assistant du développeur qui apporte le sien.

## 11. Règles de code

Le code doit se lire sans explication : des modules petits et nommés, peu de commentaires, tous courts.

**Modules**

- Un fichier, une responsabilité. 200 lignes au plus par fichier, 40 lignes au plus par fonction.
- Chaque module de l'API suit la même forme : `routes.ts`, `service.ts`, `repository.ts`, `schemas.ts`, `index.ts`.
- Seul `index.ts` est importable depuis un autre module. Une règle de lint interdit les imports profonds.
- Côté interface : un dossier par fonctionnalité (`features/routes`, `features/sandbox`), composants partagés dans `components/ui`.
- Aucune logique métier dans les composants ni dans les gestionnaires de routes.
- Types et schémas partagés définis une seule fois dans `packages/shared`.

**Commentaires**

- Les commentaires représentent au plus 20 % des lignes d'un fichier.
- Un commentaire tient sur une ligne et explique le pourquoi, jamais le quoi.
- Pas de bloc d'en-tête, pas de code commenté, pas de commentaire qui répète le nom de la fonction.
- Une seule exception : une ligne de description au-dessus de chaque fonction exportée d'un module.
- Un script d'intégration continue mesure le ratio et bloque au-delà de 20 %.

**Rédaction**

- Aucun tiret cadratin, nulle part : interface, traductions, documentation, commentaires, messages de commit. Un contrôle automatique refuse le caractère.
- Identifiants et commentaires en anglais, textes d'interface dans les fichiers de traduction.
- Aucune chaîne visible par l'utilisateur écrite dans le code.

**Qualité**

| Contrôle | Seuil |
| --- | --- |
| TypeScript | Mode strict, zéro `any` implicite |
| Lint et format | ESLint et Prettier, zéro avertissement |
| Tests | Unitaires sur les services et le moteur du simulateur, un test de bout en bout par parcours P0 |
| Licences | Audit automatique, liste blanche de licences permissives |
| Commits | Format conventionnel, un sujet par commit |
| Revue | Chaque fusion relue par l'autre membre de l'équipe |

## 12. Consignes pour Claude Code et ressources externes

Claude Code s'appuie sur cinq dépôts, tous sous licence MIT à la date de ce document, chacun avec un rôle précis.

| Dépôt | Ce que c'est | Rôle dans Overpass | Mise en place |
| --- | --- | --- | --- |
| [ECC](https://github.com/affaan-m/ECC) | Extension Claude Code : agents, skills, règles, hooks | Méthode de travail : planifier, tester d'abord, relire, contrôler la sécurité | `/plugin marketplace add https://github.com/affaan-m/ECC` puis `/plugin install ecc@ecc`. Copier `rules/common` et `rules/typescript` dans `.claude/rules/ecc/` |
| [awesome-design-md](https://github.com/VoltAgent/awesome-design-md) | Catalogue de fichiers `DESIGN.md` | Point de départ du `DESIGN.md` d'Overpass | Copier une base sobre et claire, puis la réécrire avec l'identité d'Overpass |
| [Hallmark](https://github.com/Nutlope/hallmark) | Skill de design d'interface | Construire chaque page, puis l'auditer | `npx skills add nutlope/hallmark` |
| [huashu-design](https://github.com/alchaincyf/huashu-design) | Skill de prototypes, d'animations et de critique | Prototype cliquable avant de coder, vidéo de démo de 90 secondes, critique en cinq dimensions | `npx skills add alchaincyf/huashu-design` |
| [VoltAgent](https://github.com/VoltAgent/voltagent) | Framework TypeScript d'agents IA | Hors du cœur du produit en première version (voir ci-dessous) | Aucune installation au lancement |

**Le cas VoltAgent.** Overpass n'exécute aucun agent IA côté serveur : le serveur MCP sert des fiches, l'assistant du développeur apporte son modèle. VoltAgent n'a donc pas de rôle dans le produit livré le 25 octobre. Il est retenu pour une évolution P2, un assistant de rédaction de fiches, qui exigerait un modèle ouvert auto-hébergé pour rester dans la règle open source.

**Ordre d'utilisation par écran**

1. `/ecc:plan` pour découper la fonctionnalité, puis validation du plan par un membre de l'équipe.
2. Prototype rapide avec huashu-design pour les écrans à fort enjeu : accueil, piste d'essai, détail d'une fiche.
3. Construction avec Hallmark, en respectant le `DESIGN.md` du dépôt.
4. Skill `tdd-workflow` d'ECC pour la logique : test en échec, code, test vert.
5. `hallmark audit` sur la page, puis `/code-review` et `/security-scan` avant fusion.

**Précautions**

- Ces dépôts servent à produire le code, ils ne sont pas des dépendances du produit. Ils figurent dans `docs/AI_USAGE.md`, pas dans le fichier de dépendances.
- Installer uniquement depuis les dépôts officiels, relire chaque skill avant de l'activer, et noter la version utilisée. Un skill est un jeu d'instructions exécuté par l'agent.
- Un `DESIGN.md` du catalogue décrit l'identité d'une marque existante. Overpass s'en inspire pour la structure, pas pour la copier : palette, typographies libres et nom des rôles sont les siens.
- Hallmark choisit lui-même un thème par défaut. Le `DESIGN.md` d'Overpass a priorité sur ce choix.
- En cas de conflit entre un skill et ce cahier des charges, le cahier des charges l'emporte.

**Bloc à placer dans `CLAUDE.md`**

```markdown
# Overpass: project rules for Claude Code

## Source of truth
- Follow docs/cahier-des-charges.md. If a skill disagrees with it, the spec wins.
- Follow DESIGN.md for every visual decision.

## Stack and licences
- TypeScript everywhere. Open source dependencies only, permissive licences only.
- Before adding a dependency, run the licence audit. Never add GPL, AGPL or LGPL code.
- No proprietary service in the product (no hosted auth, no paid AI API, no map API).

## Code shape
- One responsibility per file. Max 200 lines per file, 40 per function.
- API modules: routes.ts, service.ts, repository.ts, schemas.ts, index.ts.
- Import another module only through its index.ts.
- No business logic in components or route handlers.

## Comments
- Comments are at most 20 percent of the lines of a file.
- One line each. Explain why, never what. No header blocks, no commented-out code.

## Writing
- Never use the em dash character, anywhere.
- No user-facing string in code. Every string lives in the fr and en translation files.
- English identifiers and comments.

## Product rules
- Every page works at 360 px wide and with the keyboard only.
- Simulated providers are built from public documentation, without logos, marked unofficial.
- Sandbox webhooks must never target private or local addresses.

## Workflow
- Plan first (/ecc:plan), wait for approval, then tdd-workflow.
- Build UI with the hallmark skill, then run hallmark audit.
- Run /code-review and /security-scan before every merge.
- Log every AI-assisted change in docs/AI_USAGE.md.
```

## 13. Planning, critères d'acceptation et points ouverts

Le code est gelé le 24 octobre, ce qui laisse une journée de marge avant la clôture du 25 à 17 h GMT.

**Étapes**

1. **12 octobre.** Déclarer le projet, ouvrir le dépôt, relire le règlement, valider la stack, écrire le `DESIGN.md`, installer les skills.
2. **13 au 15 octobre.** Comptes, fiches et recherche d'un côté. Moteur du simulateur et scénarios de l'autre. Bascule des langues en place dès le premier écran.
3. **16 au 18 octobre.** Vérifications, pièges et classement. Deux opérateurs simulés, inspecteur, clés de test. Serveur cloud Systalink actif le 16 au plus tard.
4. **19 octobre.** Ouverture en bêta aux autres équipes du challenge.
5. **20 et 21 octobre.** Dix fiches réelles, discussions, serveur MCP en lecture seule, documentation.
6. **22 octobre.** Accueil, tarifs, blog avec trois articles, newsletter, démo sans inscription, passage mobile et accessibilité.
7. **23 octobre.** Audit des licences, tests de bout en bout, sécurité, vidéo de 90 secondes.
8. **24 octobre.** Gel du code et soumission.

**Ordre de coupe en cas de retard.** PayDunya, puis PI-SPI, puis envoi automatique de la newsletter (l'inscription reste), puis serveur MCP, puis classement, puis blog, puis discussions. Le simulateur avec Wave et le relais local, les fiches et les vérifications ne se coupent pas.

**Critères d'acceptation**

- [ ] Un visiteur lance un paiement simulé depuis l'accueil en moins de 30 secondes, sans compte.
- [ ] Un nouvel inscrit publie une fiche et en vérifie une autre en moins de 5 minutes.
- [ ] Toutes les pages existent en français et en anglais, sans chaîne manquante.
- [ ] Les parcours P0 passent sur un écran de 360 px et au clavier seul.
- [ ] L'accueil s'affiche en moins de 3 secondes sur une connexion 3G simulée.
- [ ] L'audit des licences ne signale aucune licence hors liste blanche.
- [ ] Aucun fichier ne dépasse 20 % de lignes de commentaires ni 200 lignes.
- [ ] Aucun tiret cadratin dans le dépôt.
- [ ] Le dépôt contient un README, `DESIGN.md`, `docs/AI_USAGE.md` et `docs/LICENSES.md` à jour.
- [ ] La démo tourne sur le serveur cloud Systalink, sous le domaine du projet.

* [ ] Un membre ouvre un sujet hors intégration, reçoit une réponse et l'accepte.
* [ ] Le blog affiche au moins trois articles, en français et en anglais.
* [ ] Une adresse s'abonne à la newsletter, confirme, reçoit un numéro et se désabonne en un clic.

**Points ouverts**

- Texte exact de la règle open source : licences permissives uniquement, ou toute licence libre ?
- Pondération des votes du public, des participants et du jury.
- Stack : tranché le 12 octobre, TypeScript de bout en bout (section 8).
- Nom : « Overpass API » désigne déjà un service d'OpenStreetMap. Garder le nom avec un qualificatif et un domaine .africa, ou en changer ?
- Opérateurs simulés : tranché le 12 octobre, revu le 14 octobre : Wave, PI-SPI puis PayDunya ; CinetPay reporté, sa documentation étant hors ligne. Revu le 20 octobre : CinetPay revient en quatrième, d'après le README de son SDK PHP officiel (section 4).
- Langue des commentaires de code : anglais par défaut dans ce document.
- Lecture retenue pour les commentaires : 20 % est un plafond, pas un quota à atteindre.
- Newsletter (16 octobre 2026, à valider) : les liens de confirmation et de désinscription ouvrent une page qui appelle `POST /v1/newsletter/confirm` et `POST /v1/newsletter/unsubscribe`, au lieu des `GET` de la section 10, pour que les antivirus de messagerie qui suivent les liens ne confirment ni ne désinscrivent à la place du lecteur ; chaque numéro porte aussi les en-têtes `List-Unsubscribe` et `List-Unsubscribe-Post` (RFC 8058). Une table `newsletter_deliveries` (file d'envoi par lots) s'ajoute à la section 9.
- Blog (16 octobre 2026) : les routes de la section 10 sont complétées par les commentaires, les étoiles, les abonnements, les signalements, la modération et `GET /v1/blogs/:handle` ; les tables `post_reports` et `blog_suspensions` s'ajoutent à celles de la mise à jour du 13 octobre.

**Sources**

- [CADev 2026, page officielle](https://systalink.com/fr/coupe-afrique-des-developpeurs-cadev)
- [ECC](https://github.com/affaan-m/ECC)
- [VoltAgent](https://github.com/VoltAgent/voltagent)
- [awesome-design-md](https://github.com/VoltAgent/awesome-design-md)
- [Hallmark](https://github.com/Nutlope/hallmark)
- [huashu-design](https://github.com/alchaincyf/huashu-design)
