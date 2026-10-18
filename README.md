# Overpass

Overpass est une plateforme communautaire et ouverte de partage, de documentation et de simulation d'itinéraires de paiement pour l'Afrique de l'Ouest et Centrale.

Ce document résume l'architecture du projet, les instructions de démarrage rapide en local, ainsi que l'ensemble des fonctionnalités et améliorations ajoutées sur la branche **`diallo`** par rapport à la version initiale clonée (`origin/main`).

---

## Démarrage rapide en local

### Prérequis
- Node.js (version 20 ou supérieure recommandée)
- npm

### 1. Installation des dépendances
```bash
npm install
```

### 2. Configuration locale (.env)
Créez un fichier `.env` à la racine (ou copiez `.env.example`) :
```ini
DATABASE_URL=postgres://overpass:overpass@127.0.0.1:5432/overpass
API_HOST=127.0.0.1
API_PORT=3000
LOG_LEVEL=info
TRUST_PROXY=0
SESSION_SECRET=development-session-secret-key-32-random-chars-min
WEB_ORIGIN=http://127.0.0.1:5173
```

### 3. Lancer l'application
Le projet intègre un fallback automatique vers PostgreSQL embarqué (PGlite). Aucun conteneur Docker ni serveur PostgreSQL externe n'est requis en développement local.

- **Serveur API (Fastify + base de données locale persistante)** :
  ```bash
  npm run dev:api
  ```
  L'API écoute sur `http://127.0.0.1:3000`.

- **Application Web (Preact + Vite)** :
  ```bash
  npm run dev:web
  ```
  L'application est accessible sur `http://127.0.0.1:5173`.

---

## Résumé des modifications apportées sur la branche `diallo`

Par rapport à la version initiale clonée (`8e3f053`), voici le récapitulatif détaillé des ajouts et optimisations réalisés :

### 1. Module et Écrans de Discussions Communautaires
- **Base de données (Migration `0007_community`)** :
  - Création des tables `community_topics`, `community_threads`, `community_replies`, `community_reply_votes`, `posts` (blog), `newsletter_subscribers` et `newsletter_issues`.
  - Amorçage des catégories de discussion techniques et réglementaires.
- **Backend API (`apps/api/src/modules/community`)** :
  - `GET /v1/topics` : liste des thématiques de discussion.
  - `GET /v1/threads` : liste paginée avec filtres combinés (sujet, pays, stack).
  - `POST /v1/threads` : création d'un sujet avec session requise.
  - `GET /v1/threads/:id` : vue détaillée d'un fil avec réponses.
  - `POST /v1/threads/:id/replies` : ajout d'une réponse.
  - `POST /v1/replies/:id/vote` : vote d'utilité sur une réponse.
  - `POST /v1/threads/:id/accept/:replyId` : validation de la solution officielle par l'auteur.
- **Frontend Preact (`apps/web/src/pages/discussions`)** :
  - `DiscussionsPage` : interface principale avec liste, tags, compteurs de réponses et badge résolu.
  - `DiscussionsFilters` : filtres interactifs par thématique, pays et stack technique.
  - `NewThreadPage` & `NewThreadFields` : formulaire de création avec validation.
  - `ThreadDetailPage` & `ThreadOriginalPost` : affichage du message initial et bouton de conversion vers un itinéraire de paiement (`/routes/new?...`).
  - `RepliesList` & `ReplyCard` : liste des réponses avec vote d'utilité et sélection de solution acceptée.
  - `ReplyComposer` : formulaire d'envoi de réponse avec invite de connexion si visiteur non authentifié.
  - Support bilingue complet (locales `fr.json` et `en.json`).

### 2. Simulateur Sandbox et Nouveaux Opérateurs
- **Gestion des scénarios de simulation** :
  - Scénarios supportés : succès, solde insuffisant, indisponibilité opérateur, webhooks dupliqués, webhooks retardés.
  - Sécurisation contre les attaques SSRF sur les URL de webhooks.
- **Nouveaux opérateurs de paiement intégrés** :
  - Intégration des simulateurs pour **PI-SPI (BCEAO)** et **PayDunya**, en complément de Wave et CinetPay.
- **Historique de simulation enrichi** :
  - Formatage de la date dans `SandboxHistory` pour afficher le jour et le mois (`17 oct., 14:35`) en plus de l'heure.

### 3. Serveur MCP pour Agents IA
- Implémentation d'un serveur MCP (Model Context Protocol) exposant 4 outils :
  - `search_routes` : recherche d'itinéraires selon différents critères.
  - `get_route` : consultation détaillée d'un itinéraire.
  - `list_potholes` : liste des signalements et problèmes signalés.
  - `simulate_payment` : exécution d'une simulation de paiement.

### 4. Environnement Local & Améliorations Graphiques
- **Fallback PGlite en développement** :
  - Connexion automatique à PostgreSQL embarqué (`.data/pglite/`) si aucun serveur PostgreSQL classique n'écoute sur le port 5432.
  - Application automatique de toutes les migrations et semences de données au démarrage.
- **Identité visuelle (Favicon)** :
  - Création de `favicon.svg` et `favicon.ico` dans `apps/web/public/`, éliminant les erreurs 404 du navigateur.

### 5. Qualité, Typage et Tests
- **Tests automatisés** : 382 tests validés sur 52 fichiers de tests.
- **TypeScript** : Typage strict sans erreur avec `exactOptionalPropertyTypes`.
- **Linter & Style** : 0 erreur, 0 avertissement ESLint (respect strict des limites de 40 lignes par fonction et 200 lignes par fichier).
- **Formatage** : Conforme aux règles Prettier du dépôt.

---

## Commandes utiles

```bash
# Lancer les tests
npm test

# Lancer la vérification de types globale
npm run typecheck

# Lancer le linter ESLint
npm run lint

# Vérifier le formatage Prettier
npm run format:check

# Appliquer le formatage Prettier
npm run format

# Contrôles de conformité du dépôt et budgets de bundles
npm run check:repo
npm run check:budget
```
