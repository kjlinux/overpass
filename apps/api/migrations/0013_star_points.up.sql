-- Ranking: one point per star received on a listed post (section 4 of the specification).
alter table member_points add column stars integer not null default 0;
