# Deployment

How Overpass runs in production and how to ship a change. Every session that deploys follows this file. No secret ever goes in this file or anywhere in the repository.

## The server

| Item | Value |
| --- | --- |
| Host | Ubuntu 22.04 LTS, 2 vCPU, 4 GB RAM, 2 GB swap |
| Access | `ssh overpass` (alias in the operator's SSH config, user root) |
| Public address | 94.237.56.199, IPv4 only, no AAAA record |
| Domain | `getoverpass.app` (canonical), `www.getoverpass.app` redirects to it with a 301 |
| Firewall | ufw: OpenSSH, 80 and 443 only |

## Layout

| Path | What it is |
| --- | --- |
| `/srv/overpass` | Git clone of `main`, owned by the `overpass` system user |
| `/etc/overpass/overpass.env` | The only environment file, `root:overpass`, mode 640. Holds every secret |
| `/srv/overpass/.env` | Symlink to the file above, read by Docker Compose, migrations, seed and the web build |
| `/etc/systemd/system/overpass-{api,worker,mcp}.service` | The three Node services, run as `overpass` with `EnvironmentFile=/etc/overpass/overpass.env` |
| `/etc/caddy/Caddyfile` | Built from `deploy/Caddyfile.example` with the domain set and a `www` redirect block added |
| Docker volume `overpass_db-data` | PostgreSQL 18 data, container `overpass-db-1`, bound to 127.0.0.1:5432 |

| Service | Listens on | Entry point |
| --- | --- | --- |
| `overpass-api` | 127.0.0.1:3000 | `apps/api/dist/server.js` |
| `overpass-worker` | none | `apps/api/dist/worker.js` |
| `overpass-mcp` | 127.0.0.1:3100 | `apps/mcp/dist/server.js` |
| `caddy` | 80, 443 | TLS from Let's Encrypt, renewed by Caddy |

## Environment file

Keys only, values live on the server. Edit with `nano /etc/overpass/overpass.env`, then restart the services that read it.

`NODE_ENV=production`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT`, `DATABASE_URL` (same password as `POSTGRES_PASSWORD`, hexadecimal so it needs no URL escaping), `API_HOST`, `API_PORT`, `LOG_LEVEL`, `TRUST_PROXY=1`, `SESSION_SECRET`, `WEB_ORIGIN=https://getoverpass.app`, `WEB_DIST_DIR=/srv/overpass/apps/web/dist`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_REQUIRE_TLS`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM`, `OVERPASS_API_URL=http://127.0.0.1:3000`, `MCP_HOST`, `MCP_PORT`.

- SMTP is optional. With `SMTP_HOST` empty the API and the worker still start, log `mails disabled: SMTP_HOST is not set`, and every mail fails: no password reset, no newsletter. Fill the three SMTP keys and restart the API and the worker to send mails.
- To check a key without printing its value: `grep -c '^SMTP_HOST=.\+$' /etc/overpass/overpass.env` answers 1 when set.
- Never `cat` the file in a session or paste it in a message.

## Before deploying

1. `npm run check` is green on the commit you ship, as for every merge.
2. The commit is on `origin/main`. The server only ever pulls `main`.
3. Another session may work in the same local clone. Run `git status -sb` first: if the clone is on someone else's branch or holds files you did not write, do not commit them and do not switch branch. Work in a separate worktree (`git worktree add <dir> origin/main -b <branch>`), then remove it.

## Routine deploy

Run from the local machine; each command is one SSH call.

```bash
ssh overpass 'sudo -u overpass -H bash -c "cd /srv/overpass && git pull --ff-only && npm ci --no-audit --no-fund && npm run build && npm run db:migrate"'
ssh overpass 'systemctl restart overpass-api overpass-worker overpass-mcp; sleep 5; systemctl --no-pager status overpass-api overpass-worker overpass-mcp | grep -E "●|Active"'
curl -s https://getoverpass.app/v1/health
```

Expected: three `active (running)` and `{"data":{"status":"ok"},"error":null}`. Static pages need no restart, Caddy serves `apps/web/dist` as soon as the build ends.

If a service loops in `activating (auto-restart)`, read `ssh overpass 'journalctl -u overpass-api -n 40 --no-pager'`. A `ZodError` names the environment key at fault.

## When the inline theme script changes

`apps/web/index.html` has one inline script, allowed by its SHA-256 in the Content-Security-Policy. When that script changes, the hash changes in three places:

1. `apps/api/src/http/security-headers.ts` and `deploy/Caddyfile.example`, in the same commit (a test compares them with the script).
2. `/etc/caddy/Caddyfile` on the server, after the deploy:

```bash
ssh overpass 'cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.bak && sed -i "s#OLD_HASH#NEW_HASH#" /etc/caddy/Caddyfile && caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile && systemctl reload caddy'
```

Compute the hash with `node -e "const s=require('fs').readFileSync('apps/web/index.html','utf8');console.log(require('crypto').createHash('sha256').update(/<script>([\s\S]*?)<\/script>/.exec(s)[1]).digest('base64'))"`. Without this step the browser blocks the script and the default theme breaks.

Any other change to `deploy/Caddyfile.example` is also copied by hand to `/etc/caddy/Caddyfile`; the server file is not regenerated by a deploy.

## Seed

The seed is idempotent: it applies migrations, creates or promotes the admin account, writes the empty itinerary templates and, with `--content-dir`, the team content from `apps/api/content`. The admin password comes from `SEED_ADMIN_PASSWORD` only, at least 10 characters, typed by the operator, never written in a file or a command line:

```bash
read -rsp "Admin password: " PW; echo
sudo -u overpass -H env SEED_ADMIN_PASSWORD="$PW" bash -c "cd /srv/overpass && npm run db:seed -- \
  --admin-email admin@getoverpass.app --country CI \
  --content-dir /srv/overpass/apps/api/content \
  --templates-dir /var/lib/overpass/route-templates"
unset PW
```

Paths are absolute because the script runs from `apps/api`. Re-run it after new content lands in `apps/api/content`.

## Database

- Start or check: `ssh overpass 'cd /srv/overpass && docker compose up -d --wait db'`.
- Roll back the last migration: `ssh overpass 'sudo -u overpass -H bash -c "cd /srv/overpass && npm run db:rollback"'`.
- Dump before a risky migration: `ssh overpass 'docker exec overpass-db-1 pg_dump -U overpass overpass | gzip > /var/backups/overpass-$(date +%F-%H%M).sql.gz'`.

## Rolling back a release

```bash
ssh overpass 'sudo -u overpass -H bash -c "cd /srv/overpass && git checkout --detach <good-commit> && npm ci --no-audit --no-fund && npm run build"'
ssh overpass 'systemctl restart overpass-api overpass-worker overpass-mcp'
```

Roll back migrations first if the bad release added some. Return to `main` with `git checkout main && git pull --ff-only` once the fix is merged.

## Pitfalls already met

- Never start a pasted SSH block with `set -e`: in an interactive shell the first failing command closes the session.
- Do not start Caddy before the DNS answers 94.237.56.199 on both names from `ns1` and `ns2.systalink.com`, with no AAAA record. Let's Encrypt allows only five failed validations per hour and per name.
- `nano` saves with Ctrl+O then Enter, then Ctrl+X. An unsaved env file showed as empty keys and a failing `docker compose`.
- Writing to `/etc/caddy` or other system files over SSH may need the operator's approval in the session's permission mode; ask instead of working around a refusal.

## After each deploy

Add one line to `docs/AI_USAGE.md` when the deploy was AI-assisted: the commit shipped, migrations applied, and any manual server step.
