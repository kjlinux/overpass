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

## Reference repositories (tools, never product dependencies)
- ECC (plugin ecc@ecc): method. Run /ecc:plan before coding, the tdd-workflow skill for logic, /code-review and /security-scan before every merge. Rules copied in .claude/rules/ecc/.
- awesome-design-md (.references/awesome-design-md): structural base for our own DESIGN.md only. Never copy a brand palette, font or role names.
- Hallmark (.claude/skills/hallmark): build each screen, then run hallmark audit.
- huashu-design (.claude/skills/huashu-design): prototype high-stakes screens (home, sandbox, route detail), five-dimension critique, demo video.
- VoltAgent (.references/voltagent): read-only reference for its DESIGN.md and MCP tool conventions. Not a product dependency.
- None of these repositories may appear in any package.json of the product.

## Guardrails when using the design skills
- DESIGN.md at the repository root is the approved direction. It replaces Hallmark theme selection and the huashu-design three-directions gate. Do not let a skill append to DESIGN.md.
- No remote assets in the product: no Google Fonts or Fontshare CDN, no unpkg, jsdelivr, Picsum, Unsplash, usehallmark.com imagery or icon CDNs. Self-host OFL fonts and one permissive icon set.
- No paid or proprietary generators: no Nanobanana, Recraft, Midjourney, Gemini, Lovart, ElevenLabs, Doubao TTS or Volcengine review.
- Demo video: do not use the bundled huashu-design music or sound effects, whose licences are unclear. Remove the watermark. No global npm install, no hyperframes init.
- Skill output still obeys this file: no em dash, strings in translation files, motion between 150 and 250 ms, one accent colour, no decorative gradient, 200 lines per file, 20 percent comments.

## Commands
- npm install: install every workspace.
- npm run check: typecheck, lint, format check, tests, repository checks. Run before every commit; CI runs the same command.
- npm run typecheck | lint | format | format:check | test: individual gates.
- npm run check:repo: em dash, 200 lines, 20 percent comments, deep imports, licence audit.
- npm run licenses: audit licences and rewrite docs/LICENSES.md. Run before keeping any new dependency.
- npm run build: compile packages and apps.
- npm run dev:api | dev:web | dev:mcp: start one application in development.
- npm run db:up | db:down: start or stop PostgreSQL with Docker Compose.
