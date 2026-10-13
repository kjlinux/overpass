-- Routes module: services, itineraries and their versions.
create table services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,39}$'),
  name text not null,
  category text not null check (category in ('payment', 'sms', 'ussd')),
  countries char(2)[] not null default '{}',
  simulated boolean not null default false
);

-- Countries from public sources consulted on 2026-10-13; PI-SPI covers the eight UEMOA states.
insert into services (slug, name, category, countries, simulated) values
  ('wave', 'Wave', 'payment', '{SN,CI,ML,BF,UG}', true),
  ('cinetpay', 'CinetPay', 'payment', '{CI,SN,CM,ML,BF,TG,BJ,GN,CD}', true),
  ('pi-spi', 'PI-SPI', 'payment', '{BJ,BF,CI,GW,ML,NE,SN,TG}', true),
  ('paydunya', 'PayDunya', 'payment', '{SN,CI,BJ,BF,TG,ML}', true),
  ('orange-money', 'Orange Money', 'payment', '{CI,SN,ML,BF,CM,GN}', false),
  ('moov-money', 'Moov Money', 'payment', '{CI,BJ,TG,BF,NE,ML,TD,GA}', false);

create table routes (
  id uuid primary key default gen_random_uuid(),
  translation_group uuid not null default gen_random_uuid(),
  author_id uuid references users (id) on delete set null,
  service_id uuid not null references services (id),
  country char(2) not null,
  stack text not null,
  language text not null check (language ~ '^[a-z]{2}$'),
  title text not null check (char_length(title) between 8 and 140),
  content text not null check (char_length(content) <= 50000),
  version integer not null default 1 check (version >= 1),
  search tsvector generated always as (
    setweight(to_tsvector(case language when 'fr' then 'french'::regconfig when 'en' then 'english'::regconfig else 'simple'::regconfig end, title), 'A')
    || setweight(to_tsvector(case language when 'fr' then 'french'::regconfig when 'en' then 'english'::regconfig else 'simple'::regconfig end, content), 'B')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index routes_translation_language_key on routes (translation_group, language) where deleted_at is null;
create index routes_search_idx on routes using gin (search);
create index routes_listing_idx on routes (updated_at desc, id desc) where deleted_at is null;
create index routes_service_idx on routes (service_id) where deleted_at is null;
create index routes_author_idx on routes (author_id) where deleted_at is null;

create table route_versions (
  route_id uuid not null references routes (id) on delete cascade,
  number integer not null check (number >= 1),
  title text not null,
  content text not null,
  author_id uuid references users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (route_id, number)
);
