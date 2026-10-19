-- A route written from a resolved thread keeps the link to that thread.
alter table routes add column source_thread_id uuid references threads (id) on delete set null;

create unique index routes_source_thread_key on routes (source_thread_id)
  where source_thread_id is not null and deleted_at is null;
