-- Images live in the database, so the API stays stateless and needs no shared disk.
create table media (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references users (id) on delete set null,
  mime text not null check (mime in ('image/png', 'image/jpeg', 'image/webp')),
  bytes bytea not null,
  size integer not null check (size > 0 and size <= 2097152),
  created_at timestamptz not null default now()
);
create index media_owner_idx on media (owner_id);
alter table posts add column cover_media_id uuid references media (id) on delete set null;
