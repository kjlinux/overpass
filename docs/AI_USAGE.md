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
