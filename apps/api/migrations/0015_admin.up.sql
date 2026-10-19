-- Admin module: itinerary moderation and reports, account suspension and the moderation log.
alter table routes add column moderation text not null default 'visible'
  check (moderation in ('visible', 'hidden'));

-- The public listing reads only visible routes, so its partial index follows the same rule.
drop index routes_listing_idx;
create index routes_listing_idx on routes (updated_at desc, id desc)
  where deleted_at is null and moderation = 'visible';
create index routes_hidden_idx on routes (updated_at desc, id desc)
  where deleted_at is null and moderation = 'hidden';

-- The primary key is the "one report per account and per itinerary" rule.
create table route_reports (
  route_id uuid not null references routes (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  reason text not null check (char_length(reason) between 3 and 500),
  created_at timestamptz not null default now(),
  primary key (route_id, user_id)
);

create index route_reports_user_idx on route_reports (user_id);

alter table users add column suspended_at timestamptz;
alter table users add column suspended_reason text check (char_length(suspended_reason) <= 500);
alter table users add constraint users_suspension_reason
  check (suspended_at is not null or suspended_reason is null);

-- Admins search accounts by handle or e-mail prefix, whatever the database collation.
create index users_email_prefix_idx on users (lower(email) text_pattern_ops);
create index users_handle_prefix_idx on users (lower(handle) text_pattern_ops);

-- Insert-only: a decision is never changed or deleted; a deleted actor only loses the link.
create table moderation_actions (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references users (id) on delete set null,
  target_kind text not null check (char_length(target_kind) between 1 and 20),
  target_id uuid not null,
  action text not null check (char_length(action) between 1 and 30),
  reason text check (char_length(reason) <= 500),
  created_at timestamptz not null default now()
);

create index moderation_actions_recent_idx on moderation_actions (created_at desc, id desc);
create index moderation_actions_actor_idx on moderation_actions (actor_id);

create function moderation_actions_insert_only() returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' and old.actor_id is not null and new.actor_id is null
    and (new.id, new.target_kind, new.target_id, new.action, new.reason, new.created_at)
      is not distinct from (old.id, old.target_kind, old.target_id, old.action, old.reason, old.created_at)
  then
    return new;
  end if;
  raise exception 'moderation_actions is insert-only';
end;
$$;

create trigger moderation_actions_insert_only before update or delete on moderation_actions
  for each row execute function moderation_actions_insert_only();
