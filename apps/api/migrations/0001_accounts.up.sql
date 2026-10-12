-- Accounts module: users, their stacks and their personal API tokens.
create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  handle text not null unique,
  country char(2) not null,
  language text not null default 'fr',
  role text not null default 'member' check (role in ('member', 'admin')),
  session_version integer not null default 0,
  newsletter_consent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table user_stacks (
  user_id uuid not null references users (id) on delete cascade,
  stack text not null,
  primary key (user_id, stack)
);

create table api_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  name text not null,
  usage text not null check (usage in ('mcp', 'api')),
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index api_tokens_active_user_idx on api_tokens (user_id) where revoked_at is null;
