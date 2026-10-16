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

-- Members who contributed before the ranking existed get their cache entry now, same weights.
insert into member_points (user_id, routes, checks, potholes, accepted, useful, points)
select id, routes, checks, potholes, accepted, useful,
  routes * 10 + checks * 2 + potholes * 5 + accepted * 5 + useful
from (
  select u.id,
    (select count(*)::int from routes r where r.author_id = u.id and r.deleted_at is null) as routes,
    (select count(*)::int from checks c where c.user_id = u.id) as checks,
    (select count(*)::int from potholes p where p.user_id = u.id and p.status = 'confirmed') as potholes,
    (select count(*)::int from threads t join replies r on r.id = t.accepted_reply_id
      where r.author_id = u.id and r.status = 'visible' and t.status = 'visible'
        and t.author_id is distinct from r.author_id) as accepted,
    (select count(*)::int from reply_votes v join replies r on r.id = v.reply_id
      where r.author_id = u.id and r.status = 'visible' and v.user_id <> u.id) as useful
  from users u
) counted
where routes + checks + potholes + accepted + useful > 0;
