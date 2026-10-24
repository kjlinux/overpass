# Overpass

La bourse des intégrations africaines vérifiées : les développeurs y échangent ce que la documentation officielle ne dit pas.

- **Itinéraires** : des fiches d'intégration par service, pays et stack (Wave, Orange Money, PI-SPI, PayDunya...), avec le code qui marche, les pièges connus et des vérifications datées par d'autres développeurs.
- **Piste d'essai** : un simulateur qui rejoue les cas réels d'un paiement mobile money, sans compte marchand. Les opérateurs simulés sont non officiels et construits depuis leur documentation publique.
- **Serveur MCP** : il sert les fiches aux assistants de code (Claude Code, Cursor, VS Code).
- Autour : discussions, blog et newsletter.

Projet de l'équipe Ghostapi (Côte d'Ivoire) pour la Coupe d'Afrique des Développeurs, Systalink Challenge 2026.

## Démarrer

Node.js 22.18 ou plus récent, et PostgreSQL 18 (Docker Compose le fournit).

```sh
cp .env.example .env      # puis renseigner SESSION_SECRET
npm install
npm run db:up             # PostgreSQL avec Docker Compose
npm run db:migrate
npm run dev:api           # API sur 127.0.0.1:3000
npm run dev:web           # site sur 127.0.0.1:5173
npm run dev:mcp           # serveur MCP sur 127.0.0.1:3100
```

`npm run check` lance le typage, le lint, le formatage, les tests, les règles du dépôt et les budgets de poids ; la CI lance la même commande. `npm run test:e2e` lance les tests Playwright.

Pour une base prête à l'emploi, le seed applique les migrations, crée ou promeut le compte équipe, puis écrit le contenu de départ attribué à ce compte : les dix fiches, un sujet d'accueil par thème et cinq articles, en français et en anglais. Il peut être relancé sans créer de doublon.

```sh
SEED_ADMIN_PASSWORD=... npm run db:seed -- --admin-email equipe@example.africa --content-dir apps/api/content
```

Sans `--content-dir`, seuls les migrations, le compte et les gabarits vides de fiches sont écrits. Le contenu vit dans `apps/api/content` : un fichier Markdown par fiche, sujet ou article, avec ses champs en tête.

## Organisation

| Dossier | Contenu |
| --- | --- |
| `apps/api` | API Fastify, modules métier, migrations SQL, contenu de départ dans `content/` |
| `apps/web` | Site Preact, bilingue français et anglais |
| `apps/mcp` | Serveur MCP en lecture seule, qui passe par l'API |
| `apps/cli` | Relais local des webhooks de la piste d'essai |
| `packages/*` | Schémas partagés, simulateur et opérateurs simulés |
| `docs` | Cahier des charges, licences des composants, journal de l'usage de l'IA |

Le design suit [DESIGN.md](DESIGN.md) ; les règles de code sont dans [CLAUDE.md](CLAUDE.md).

## Licence

Code sous licence [MIT](LICENSE), © 2026 Ghostapi (Jude Koffi et Bradi). Les composants tiers gardent leur propre licence, toutes permissives : voir [docs/LICENSES.md](docs/LICENSES.md). Les polices IBM Plex sont sous SIL Open Font License 1.1.
