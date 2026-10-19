-- Requests module: services proposed by members and votes for a new simulator.
create table service_proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 60),
  category text not null check (category in ('payment', 'sms', 'ussd')),
  country char(2) not null,
  docs_url text not null check (docs_url like 'https://%' and char_length(docs_url) <= 500),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  reason text check (char_length(reason) <= 500),
  service_id uuid references services (id) on delete set null,
  decided_by uuid references users (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create index service_proposals_pending_idx on service_proposals (created_at) where status = 'pending';
create index service_proposals_user_idx on service_proposals (user_id, created_at desc);

-- The primary key is the "one vote per account" rule.
create table simulator_votes (
  service_id uuid not null references services (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (service_id, user_id)
);
