# AI usage log

Every intervention of an AI assistant on this repository is logged here, newest last. Dates are UTC.

## Reference repositories

These repositories help produce the code. None of them is a product dependency.

| Repository | Version or commit | Licence found | Role in Overpass |
| --- | --- | --- | --- |
| [ECC](https://github.com/affaan-m/ECC) | plugin ecc@ecc 2.2.3, commit b92f181b3b748d1abbc2afd94af6aa7d8c8fca29 (also cloned in .references/ECC) | MIT | Method: /ecc:plan, tdd-workflow, /code-review, /security-scan. Rules rules/common and rules/typescript copied to .claude/rules/ecc/ |
| [awesome-design-md](https://github.com/VoltAgent/awesome-design-md) | commit 13be5c05c63be24b57581162364167028020f043 (2026-10-05) | MIT | Structural base for our own DESIGN.md |
| [Hallmark](https://github.com/Nutlope/hallmark) | skill 1.1.0, commit 13ac0ec7e148655948100b6396439e481361d690 | MIT | Build each screen, then hallmark audit |
| [huashu-design](https://github.com/alchaincyf/huashu-design) | commit 0830494ecb1c117e25b313a8114fe55a6bf2b125 | MIT | Prototypes of high-stakes screens, five-dimension critique, demo video |
| [VoltAgent](https://github.com/VoltAgent/voltagent) | commit 72a46c76b4507e1f98b41d5050a92bd30587eb70 (2026-09-27) | MIT | Read-only reference: its DESIGN.md and MCP tool conventions |

Skills were installed with `npx skills add <repo> -a claude-code -y --copy` and `DO_NOT_TRACK=1` to disable install telemetry. Hashes are pinned in skills-lock.json. The skill folders are not committed (huashu-design ships about 27 MB of audio with unclear licences); restore them with `npx skills experimental_install`.

## Skill review findings

Both SKILL.md files were read in full before use. Instructions outside the project frame:

- **Hallmark.** It picks one of 21 themes unless a root DESIGN.md exists, and it appends an Exports section to that file. It defaults to Google Fonts and Fontshare CDNs, hotlinked images (Picsum, Unsplash, usehallmark.com) and icon CDNs. It suggests paid image generators (Nanobanana, Recraft, Midjourney). Its motion durations reach 420 ms, one genre uses gradient blooms and two accents, and its copy guide recommends the em dash. It has no i18n rule. No telemetry and no bundled script.
- **huashu-design.** It requires three design directions before any design and runs WebSearch first. It suggests paid generators and services (Gemini, Lovart, ElevenLabs, Doubao TTS, Volcengine review). Prototypes load React and Babel from unpkg. HyperFrames init writes skills into the user profile, and some scripts expect a global Playwright. Bundled music has no stated licence, and its sound effects come from ElevenLabs. Animations carry a watermark by default. Its own npm tools include sharp, whose libvips binaries are LGPL-3.0; this stays outside the product.
- **Resolution.** CLAUDE.md lists guardrails that override these defaults. The project rules and the spec win.

## Log

### 2026-10-12, Claude Code (Claude Opus 5.5), bootstrap

- **Plan.** Ran /ecc:plan on steps 1 to 5 of the bootstrap prompt. The plan was approved by Jude Koffi.
- **Spec file.** Renamed `docs/Overpass cahier des charges.md` to `docs/cahier-des-charges.md`, the path used by the prompt and by section 12.
- **References.** Verified the ECC plugin, cloned three repositories into .references/ (ignored by git), copied the ECC rules, installed Hallmark and huashu-design, and had both SKILL.md files reviewed in full.
- **CLAUDE.md.** Copied the section 12 block verbatim, then added repository roles, skill guardrails and project commands.
- **Monorepo.** Created npm workspaces for apps/api (Fastify health route, translated error envelope, request id), apps/mcp (MCP server over stdio with no tool), packages/shared (envelope, languages, API messages in fr and en), packages/simulator and packages/providers (types only). Added Docker Compose with PostgreSQL 18.
- **Quality gates.** `npm run check` runs strict TypeScript, ESLint and Prettier with zero warnings, Vitest, and repository checks for em dashes, 200 lines, 20 percent comments, deep imports and licences. GitHub Actions runs the same command and starts the database.
- **Licence audit.** The audit reads every lockfile entry, indirect and all-platform packages included. The allow list adds 0BSD, MIT-0, BlueOak-1.0.0, Python-2.0, CC0-1.0, Unlicense and Zlib to the spec list, as proposed in the plan.
- **Blocked, apps/web.** Vite 8 depends on lightningcss (MPL-2.0), and so does Tailwind 4. @vitejs/plugin-react pulls caniuse-lite (CC-BY-4.0) through Babel. The web app was not created. Proposed alternative, audited clean on 173 packages: Vite 7.3.7, @vitejs/plugin-react-swc 4, Tailwind CSS 3.4.19 with PostCSS. Vite 7.3.7 is pinned at the root today only so that Vitest avoids Vite 8.
- **ECC rules copy.** Replaced the three em dashes of .claude/rules/ecc/common/agents.md with colons, because the spec forbids the character in the whole repository.
- **Versions.** TypeScript is pinned to 6.0 because typescript-eslint 8.71 does not support TypeScript 7.

### 2026-10-12, Claude Code (Claude Opus 5.5), web app and spec updates

- **Decisions by Jude Koffi.** Adopt the audited web stack. Keep the three default choices from the bootstrap plan. Simulated operators in this order: Wave, CinetPay, PI-SPI (BCEAO instant payment system), then PayDunya.
- **apps/web.** Vite 7.3.7, @vitejs/plugin-react-swc 4, Tailwind CSS 3.4.19 with PostCSS, React 19, React Router 8, i18next. One placeholder page served under /fr and /en, with every string in the fr and en files. Wired into typecheck, lint (no literal string in JSX), tests, build and repository checks.
- **Audits.** Licence audit clean on 390 packages. `npm audit --omit=dev` reports nothing. The full audit flags braces and postcss-selector-parser, build tools pulled by Tailwind CSS 3 that only read our own sources; accepted and recorded in section 8 of the spec.
- **Spec.** Section 4 lists the four simulated operators and the PI-SPI documentation link. Section 8 records the retained versions and the lightningcss MPL-2.0 reason. The open points line in section 13 now matches section 4.
- **Design direction for later.** Jude Koffi recommends starting the huashu-design prototypes and DESIGN.md from the colours of the Systalink website, with freedom to choose. To reconcile with section 12, which asks for a palette of Overpass's own.

### 2026-10-12, Claude Code (Claude Opus 5.5), page weight and decisions

- **Decisions by Jude Koffi.** Cut order: PayDunya first, then PI-SPI; Wave and CinetPay are never cut (spec section 13 updated). Overpass keeps its own palette: no Systalink colour or accent; three original colour directions will be proposed at the DESIGN.md step. JavaScript budget for the empty home page: under 80 KB gzip.
- **Weight reductions.** Packages marked side-effect free so Zod no longer reaches the browser. Only the active language file is loaded, as its own chunk. The home page is loaded on demand behind a skeleton. React Router runs in declarative mode. i18next-browser-languagedetector was replaced by a small tested detection (URL, stored choice, browser). Result: 142 KB down to 98.6 KB gzip.
- **Budget check.** `npm run check:budget` builds the web app, follows the Vite manifest from the entry and the home page chunks, gzips each file and fails above 80 KB of JavaScript or 200 KB in total. It is part of `npm run check`.
- **Blocked.** React DOM alone weighs 65 KB gzip, so React 19 plus i18next exceed 80 KB before any router. Measured alternative, not adopted: Preact with preact-iso (both MIT) and the same i18next code, about 30 KB gzip. React Router 8 does not run on Preact (it needs useOptimistic). Waiting for a decision.

### 2026-10-12, Claude Code (Claude Opus 5.5), switch to Preact

- **Decision by Jude Koffi.** Option A: Preact with preact-iso instead of React and React Router, to meet the 80 KB budget.
- **Change.** React, React Router, their types and the SWC plugin were removed. Preact 11, preact-iso 2 and @preact/compat 18 (all MIT) were added. Root npm overrides point `react` and `react-dom` to @preact/compat, so react-i18next shares the Preact runtime and real React is never installed. TypeScript paths map the React types to Preact. Vite compiles JSX with its built-in esbuild.
- **Rendering.** Language routes `/:lang` and `/:lang/*`, unknown paths redirect to the active language, and the home page loads on demand. The skeleton is in index.html, so it paints before any JavaScript. Tests prerender the app with preact-render-to-string.
- **Result.** Home page JavaScript is 29.8 KB gzip, under the 80 KB budget. All checks pass. Spec section 8 updated.

### 2026-10-12, Claude Code (Claude Fable 5.1), design system, components, bilingual layout

- **DESIGN.md.** Written from the structure of the cal.com analysis of awesome-design-md (the most sober light base of the catalogue) and compared with the VoltAgent DESIGN.md. Every value is Overpass's own: palette with named roles and measured AA contrasts, two OFL typefaces, 4 px scale, components, do and don't lists. Hallmark's theme selection and export sections are bypassed as CLAUDE.md requires.
- **Three directions (huashu-design).** Shared spec in design-demos/design-spec.md, three prototypes produced by three independent agents: Grille (roulette logic; the roll landed on a dark gradient style, replaced by the nearest spec-compatible style, Functional Brutalism), Service (reference logic, GOV.UK principles without its colours or font) and Atelier (designer logic, Rasmus Andersson). Canvas in design-demos/index.html, screenshots in design-demos/shots/. Fonts for the prototypes were downloaded once from the fontsource packages into design-demos/fonts/ (folder ignored by git), never hotlinked.
- **Decision by Jude Koffi.** "je choisis celui avec la couleur bleu !", confirmed as direction A, Grille (ink blue #213E9E, IBM Plex Sans and IBM Plex Mono, square corners, ruled grid). Recorded in design-demos/direction-approved.md. DESIGN.md updated accordingly, including a decision to apply the dark theme only through a user choice, never from the system preference.
- **Fonts and icons.** IBM Plex Sans 400 to 700 and IBM Plex Mono 400 and 500 copied as woff2 into apps/web/public/fonts with their OFL licence texts. lucide-preact 1.55.0 (ISC) added for the single icon set; licence audit clean.
- **Component system (Hallmark, against DESIGN.md).** apps/web/src/components/ui: Button (primary, secondary, ghost, danger, loading, icon-only, link), Field with TextInput, Select, Textarea and Choice, Card, StatusBadge (voie libre, à vérifier, signalée cassée) and Chip, Table, Tabs with roving focus, ConfirmDialog on the native dialog element, Notification and NotificationStack, CodeBlock with copy and aria-live confirmation, Skeleton, EmptyState. Placed under src/ rather than apps/web/components so the existing Vite, TypeScript, lint and test configuration applies unchanged; this is the one deviation from the prompt.
- **Bilingual.** One translation file per module (app, ui, layout, errors, showcase), discovered with a Vite glob and loaded as separate chunks per language. URLs stay prefixed /fr and /en, detection and memory unchanged, language selector in the header built from the shared language list and autonyms, so adding a language is one file per module plus one entry in packages/shared. The translation test checks key parity across every language of every module.
- **Common layout.** Masthead header with the navigation on its own ruled row and a menu button under 1024 px, footer with the inactive newsletter form first, skip link, 404 and server error pages (error boundary), and the component showcase at /fr/components and /en/components.
- **Checks.** Typecheck, lint, tests (48), repository rules, licence audit and the home page budget (about 35 KB of JavaScript gzip) pass. Chrome checks at 360 px with device emulation: no horizontal scroll (the table scrolls inside its wrapper), menu, tabs by arrow keys, native dialog focus and Escape, language switch to /en with the stored choice, all verified. Hallmark audit of the layout: no critical or major finding; the stamp in src/index.css references DESIGN.md.
- **Tooling notes.** The Bash tool truncates commands above roughly 12 KB, so files were written one or two per command. The ECC GateGuard hook asks for facts before each new file written with the Write tool.

