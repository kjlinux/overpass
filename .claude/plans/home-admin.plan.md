# Plan: home page, remaining public pages, admin module

Approved by Jude Koffi on 2026-10-16 ("ok"), home proposal B "Bandeau" chosen ("home b").
Decisions: motion 150 to 250 ms, home counters 400 ms once, scene the only loop (DESIGN.md updated);
countries as a ruled tile grid, no map data; share tags pre-rendered for static public pages, generic
tags for dynamic pages (open point); a visible theme switch in the header, never an automatic switch.

## Contract shared by the work streams

All responses use the existing envelope (`ok(data)`), `cache-control: no-store` unless stated.
Shared zod schemas and types live in `packages/shared/src/admin` and `packages/shared/src/stats`.

### Public figures

`GET /v1/stats` (no account, rate limited 120/min per IP, `cache-control: public, max-age=60`):

```json
{ "routes": 0, "checks": 0, "countries": ["BF", "CI"], "updatedAt": "2026-10-16T12:00:00.000Z" }
```

- `routes`: published itineraries not deleted and not hidden by moderation.
- `checks`: checks on those itineraries.
- `countries`: sorted ISO codes where at least one service is available (services.countries union
  community coverage), so the home page tile grid and the "pays couverts" figure share one source.
- Never a hard-coded number anywhere in the product.

### Itinerary moderation (new)

- Migration 0015: `routes.moderation text not null default 'visible' check in ('visible','hidden')`,
  `route_reports (route_id, user_id, reason, created_at, primary key (route_id, user_id))`,
  `users.suspended_at timestamptz null`, `users.suspended_reason text null`,
  `moderation_actions (id uuid pk, actor_id uuid null references users on delete set null,
  target_kind text, target_id uuid, action text, reason text null, created_at timestamptz default now())`,
  insert-only (no update or delete grant path in code), index on `created_at desc`.
- `POST /v1/routes/:id/reports` `{ reason }` (member, once per account, not on own route).
- A hidden itinerary disappears from the catalogue, search, detail (404 for everyone but its author
  and admins), MCP (the MCP reads the API), ranking points, newsletter prefill and `/v1/stats`.
  One visibility predicate, tested on every reader.

### Admin API (role admin only, checked in the service, 403 otherwise; CSRF origin check applies)

- `GET /v1/admin/queue?kind=route|thread|reply|post|comment&cursor=` reported or hidden content,
  newest report first, 50 per page: `{ items: [{ kind, id, title, excerpt, author, reports,
  lastReportAt, status }], next }`.
- `POST /v1/admin/routes/:id/moderation` `{ decision: "hide"|"restore", reason? }`.
- Existing decisions (`/v1/moderation/:kind/:id`, blog moderation, proposals) keep their routes and
  now also write a `moderation_actions` row through the admin module's log port, injected like
  `ranking.listener`.
- `GET /v1/admin/accounts?q=&cursor=` (handle or e-mail prefix): `{ items: [{ id, handle, email,
  country, role, createdAt, suspendedAt }], next }`.
- `POST /v1/admin/accounts/:id/suspend` `{ reason }` and `POST /v1/admin/accounts/:id/reactivate`.
  An admin cannot suspend itself or another admin. Suspension bumps `session_version` (all sessions
  end), and a suspended account is refused at sign-in, at session resolution and with personal
  tokens (MCP and API) with a written error `account_suspended`.
- `GET /v1/admin/log?cursor=`: `{ items: [{ id, actor, targetKind, targetId, action, reason,
  createdAt }], next }`.
- Rate limits on every admin route; all reads `no-store`.

### Web routes

- `/:lang/` home (proposal B), `/:lang/pricing`, `/:lang/about`, `/:lang/legal`, `/:lang/privacy`.
- `/:lang/admin` with tabs queue, accounts, content (links to the blog editor and the newsletter
  issues), log. `/:lang/moderation` redirects to `/:lang/admin`.

## Work streams

1. API: stats, migration 0015, itinerary reports and visibility, admin module, suspension, log.
2. Public pages: pricing, about, legal, privacy, share tags pre-render, share image.
3. Home page: proposal B built with Hallmark, embedded demo, scene, counters, theme switch, budgets.
4. Admin screens, after stream 1.
5. Audits: hallmark audit per page, huashu-design critique of the real home page, keyboard pass,
   360 px, CPU x4 measures with and without the scene, /code-review, /security-scan on the admin
   routes, `npm run check`, docs/AI_USAGE.md.

## Budgets

- Home page first load: 80 KB of JS gzip, 200 KB in all without fonts (images and lazy chunks
  loaded on the home page included, scene excluded).
- Scene chunk: 180 KB gzip, checked in CI (measured spike: 130 KB).
