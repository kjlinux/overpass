-- Checks module: dated checks and reported potholes; the route state is computed from them.
create table checks (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references routes (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  country char(2) not null,
  environment text not null check (environment in ('test', 'production')),
  checked_at timestamptz not null default now()
);

create index checks_route_idx on checks (route_id, checked_at desc);
create index checks_user_route_idx on checks (user_id, route_id, checked_at desc);

create table potholes (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references routes (id) on delete cascade,
  user_id uuid references users (id) on delete set null,
  description text not null check (char_length(description) between 10 and 2000),
  status text not null default 'open' check (status in ('open', 'confirmed', 'resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index potholes_unresolved_idx on potholes (route_id) where status <> 'resolved';
-- One account alone must never be able to report a route broken.
create unique index potholes_one_unresolved_per_user on potholes (route_id, user_id) where status <> 'resolved';
create index potholes_user_idx on potholes (user_id);
