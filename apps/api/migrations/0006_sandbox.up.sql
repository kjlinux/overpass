-- Test keys are stored as SHA-256 digests; demo keys have no owner.
create table sandbox_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users (id) on delete cascade,
  provider text not null check (provider ~ '^[a-z][a-z0-9-]{1,30}$'),
  key_hash text not null unique,
  prefix text not null,
  scenario text not null check (scenario in ('success', 'insufficient_funds', 'timeout', 'duplicate_webhook', 'late_webhook')),
  target text not null default 'inbox' check (target in ('inbox', 'url', 'relay')),
  webhook_url text check (webhook_url ~ '^https?://'),
  quota integer not null default 1000 check (quota > 0),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (target <> 'url' or webhook_url is not null)
);
create index sandbox_keys_user on sandbox_keys (user_id) where revoked_at is null;

create table sandbox_events (
  id uuid primary key default gen_random_uuid(),
  seq bigint generated always as identity unique,
  key_id uuid not null references sandbox_keys (id) on delete cascade,
  provider text not null,
  scenario text not null,
  request jsonb not null,
  response jsonb not null,
  created_at timestamptz not null default now()
);
create index sandbox_events_key on sandbox_events (key_id, seq desc);
create index sandbox_events_age on sandbox_events (created_at);

create table sandbox_objects (
  key_id uuid not null references sandbox_keys (id) on delete cascade,
  provider text not null,
  kind text not null,
  object_id text not null,
  body jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (key_id, provider, kind, object_id)
);
create index sandbox_objects_age on sandbox_objects (updated_at);

-- The queue, the inspector history and the relay replay log in one table.
create table sandbox_deliveries (
  id uuid primary key default gen_random_uuid(),
  seq bigint generated always as identity unique,
  key_id uuid not null references sandbox_keys (id) on delete cascade,
  event_id uuid not null references sandbox_events (id) on delete cascade,
  provider text not null,
  event jsonb not null,
  event_type text not null,
  target text not null check (target in ('inbox', 'url', 'relay')),
  webhook_url text,
  status text not null default 'scheduled' check (status in ('scheduled', 'sent', 'delivered', 'failed')),
  attempts integer not null default 0,
  body text not null default '',
  headers jsonb not null default '{}',
  response_status integer,
  duration_ms integer,
  last_error text,
  due_at timestamptz not null,
  -- A claimed delivery is invisible to other workers until its lease ends.
  leased_until timestamptz,
  sent_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);
create index sandbox_deliveries_due on sandbox_deliveries (due_at) where status = 'scheduled';
create index sandbox_deliveries_relay on sandbox_deliveries (key_id, seq) where status = 'sent';
create index sandbox_deliveries_event on sandbox_deliveries (event_id);

-- CinetPay is postponed while its documentation is offline (decision of 2026-10-14).
update services set simulated = false where slug = 'cinetpay';
