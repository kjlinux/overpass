-- Ranking module: a cache of computed points, rebuilt for an account at each contribution.
create table member_points (
  user_id uuid primary key references users (id) on delete cascade,
  routes integer not null default 0,
  checks integer not null default 0,
  potholes integer not null default 0,
  accepted integer not null default 0,
  useful integer not null default 0,
  articles integer not null default 0,
  points integer not null default 0 check (points >= 0),
  updated_at timestamptz not null default now()
);

create index member_points_rank_idx on member_points (points desc, user_id) where points > 0;
