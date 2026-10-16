-- Discussions module: translated themes, threads, replies, useful votes and reports.
create table topics (
  slug text primary key check (slug ~ '^[a-z][a-z-]{1,29}$'),
  position integer not null unique,
  names jsonb not null,
  descriptions jsonb not null
);

insert into topics (slug, position, names, descriptions) values
  ('integrations', 1,
    '{"fr": "Intégrations et API", "en": "Integrations and APIs"}',
    '{"fr": "Paiement, SMS, USSD : brancher un service et le faire marcher.", "en": "Payments, SMS, USSD: plugging a service in and making it work."}'),
  ('cloud', 2,
    '{"fr": "Cloud et déploiement", "en": "Cloud and deployment"}',
    '{"fr": "Hébergement, serveurs, CI et mise en production.", "en": "Hosting, servers, CI and going live."}'),
  ('tools-ai', 3,
    '{"fr": "Outils et IA", "en": "Tools and AI"}',
    '{"fr": "Éditeurs, assistants de code, bibliothèques et modèles ouverts.", "en": "Editors, coding assistants, libraries and open models."}'),
  ('career', 4,
    '{"fr": "Carrière et freelance", "en": "Career and freelancing"}',
    '{"fr": "Trouver des clients, fixer ses prix, progresser.", "en": "Finding clients, setting prices, growing."}'),
  ('projects', 5,
    '{"fr": "Projets et entraide", "en": "Projects and mutual help"}',
    '{"fr": "Montrer un projet, demander un avis, trouver de l''aide.", "en": "Showing a project, asking for feedback, finding help."}'),
  ('events', 6,
    '{"fr": "Événements et communautés", "en": "Events and communities"}',
    '{"fr": "Meetups, hackathons et communautés tech du continent.", "en": "Meetups, hackathons and tech communities across the continent."}');

create table threads (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references users (id) on delete set null,
  topic text not null references topics (slug),
  title text not null check (char_length(title) between 8 and 140),
  content text not null check (char_length(content) between 1 and 20000),
  error_text text check (char_length(error_text) <= 4000),
  code_text text check (char_length(code_text) <= 20000),
  language text not null check (language ~ '^[a-z]{2}$'),
  country char(2),
  stack text,
  route_id uuid references routes (id) on delete set null,
  service_id uuid references services (id),
  accepted_reply_id uuid,
  status text not null default 'visible' check (status in ('visible', 'hidden', 'removed')),
  created_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now()
);

create index threads_listing_idx on threads (last_activity_at desc, id desc) where status = 'visible';
create index threads_route_idx on threads (route_id) where route_id is not null;
create index threads_author_idx on threads (author_id);

create table replies (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references threads (id) on delete cascade,
  author_id uuid references users (id) on delete set null,
  content text not null check (char_length(content) between 1 and 20000),
  useful_count integer not null default 0 check (useful_count >= 0),
  status text not null default 'visible' check (status in ('visible', 'hidden', 'removed')),
  created_at timestamptz not null default now()
);

create index replies_thread_idx on replies (thread_id, created_at);
create index replies_author_idx on replies (author_id);

alter table threads add constraint threads_accepted_reply_fkey
  foreign key (accepted_reply_id) references replies (id) on delete set null;

-- The primary key is the "one useful vote per account" rule.
create table reply_votes (
  reply_id uuid not null references replies (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (reply_id, user_id)
);

create index reply_votes_user_idx on reply_votes (user_id);

create table reports (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('thread', 'reply')),
  target_id uuid not null,
  user_id uuid not null references users (id) on delete cascade,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- A moderator decision resolves the reports; an account may then report again.
create unique index reports_one_open_per_user on reports (kind, target_id, user_id) where resolved_at is null;
create index reports_open_idx on reports (kind, target_id) where resolved_at is null;
