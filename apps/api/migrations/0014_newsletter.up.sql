-- Newsletter module: double opt-in subscribers, reviewed weekly issues and a batched sending queue.
create table newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email) and char_length(email) <= 254),
  language text not null check (language ~ '^[a-z]{2}$'),
  confirm_token_hash text unique,
  confirm_expires_at timestamptz,
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index newsletter_subscribers_active_idx on newsletter_subscribers (language, id)
  where confirmed_at is not null and unsubscribed_at is null;

-- An issue stores references, rendered at sending time so hidden content never goes out.
create table newsletter_issues (
  id uuid primary key default gen_random_uuid(),
  number integer not null check (number > 0),
  language text not null check (language ~ '^[a-z]{2}$'),
  subject text not null check (char_length(subject) between 1 and 140),
  intro text not null default '' check (char_length(intro) <= 5000),
  items jsonb not null default '[]',
  status text not null default 'draft' check (status in ('draft', 'queued', 'sent')),
  created_by uuid references users (id) on delete set null,
  created_at timestamptz not null default now(),
  queued_at timestamptz,
  sent_at timestamptz,
  recipients integer not null default 0 check (recipients >= 0),
  constraint newsletter_issues_number unique (language, number)
);

create table newsletter_deliveries (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references newsletter_issues (id) on delete cascade,
  subscriber_id uuid not null references newsletter_subscribers (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'skipped')),
  attempts integer not null default 0 check (attempts >= 0),
  due_at timestamptz not null default now(),
  sent_at timestamptz,
  last_error text check (char_length(last_error) <= 500),
  constraint newsletter_deliveries_once unique (issue_id, subscriber_id)
);

create index newsletter_deliveries_due_idx on newsletter_deliveries (due_at, id) where status = 'pending';
