create table topics (
  id uuid primary key,
  name text not null unique,
  description text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table threads (
  id uuid primary key,
  author_id uuid references users(id) on delete set null,
  topic_id uuid not null references topics(id) on delete cascade,
  title text not null,
  content text not null,
  language text not null default 'fr',
  country varchar(2),
  stack varchar(32),
  route_id uuid references routes(id) on delete set null,
  accepted_reply_id uuid,
  status text not null default 'open',
  reports_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table replies (
  id uuid primary key,
  thread_id uuid not null references threads(id) on delete cascade,
  author_id uuid references users(id) on delete set null,
  content text not null,
  useful_votes integer not null default 0,
  status text not null default 'visible',
  reports_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table posts (
  id uuid primary key,
  author_id uuid references users(id) on delete set null,
  slug text not null unique,
  title text not null,
  summary text not null,
  content text not null,
  language text not null default 'fr',
  category text not null default 'news',
  status text not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table newsletter_subscribers (
  id uuid primary key,
  email text not null unique,
  language text not null default 'fr',
  confirmation_token text not null,
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now()
);

create table newsletter_issues (
  id uuid primary key,
  issue_number integer not null unique,
  language text not null default 'fr',
  subject text not null,
  content text not null,
  sent_at timestamptz not null default now(),
  recipient_count integer not null default 0
);

create index idx_threads_topic on threads(topic_id, created_at desc);
create index idx_replies_thread on replies(thread_id, created_at asc);
create index idx_posts_slug on posts(slug);
create index idx_newsletter_token on newsletter_subscribers(confirmation_token);

insert into topics (id, name, description, sort_order) values
  ('d0000001-0000-4000-8000-000000000001', 'Integrations et API', 'Discussions techniques autour des passerelles, webhooks et SDKs', 1),
  ('d0000001-0000-4000-8000-000000000002', 'Cloud et deploiement', 'Hebergement, serveurs locaux, DNS et conteneurs en Afrique', 2),
  ('d0000001-0000-4000-8000-000000000003', 'Outils et IA', 'Editeurs, MCP, assistants de code et productivite pour developpeurs', 3),
  ('d0000001-0000-4000-8000-000000000004', 'Carriere et freelance', 'Tarifs, contrats, teletravail et marche tech africain', 4),
  ('d0000001-0000-4000-8000-000000000005', 'Projets et entraide', 'Retours sur vos applications et recherche de contributeurs', 5),
  ('d0000001-0000-4000-8000-000000000006', 'Evenements et communautes', 'Meetups, hackathons et conferences de la zone UEMOA et au-dela', 6);
