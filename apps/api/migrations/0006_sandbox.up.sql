-- Sandbox module: test keys and replayable simulation events.
create table sandbox_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users (id) on delete cascade,
  provider_id text not null,
  key_hash text not null unique,
  quota_remaining integer not null default 100,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index sandbox_keys_hash_idx on sandbox_keys (key_hash);

create table sandbox_events (
  id uuid primary key default gen_random_uuid(),
  key_id uuid not null references sandbox_keys (id) on delete cascade,
  scenario text not null,
  request_method text not null,
  request_path text not null,
  request_headers jsonb not null default '{}'::jsonb,
  request_body jsonb,
  response_status integer not null,
  response_headers jsonb not null default '{}'::jsonb,
  response_body jsonb,
  webhooks jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index sandbox_events_key_idx on sandbox_events (key_id, created_at desc);
create index sandbox_events_created_at_idx on sandbox_events (created_at);
