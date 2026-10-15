-- The relay cursor follows send order: a late delivery gets a higher number than earlier ones.
create sequence sandbox_sent_seq;
alter table sandbox_deliveries add column sent_seq bigint unique;

with ordered as (
  select id, row_number() over (order by sent_at, seq) as n
  from sandbox_deliveries
  where status = 'sent'
)
update sandbox_deliveries d set sent_seq = ordered.n from ordered where d.id = ordered.id;
select setval('sandbox_sent_seq', (select coalesce(max(sent_seq), 0) + 1 from sandbox_deliveries), false);

create function sandbox_assign_sent_seq() returns trigger language plpgsql as $$
begin
  if new.status = 'sent' and new.sent_seq is null then
    new.sent_seq := nextval('sandbox_sent_seq');
  end if;
  return new;
end;
$$;
create trigger sandbox_deliveries_sent_seq
  before insert or update on sandbox_deliveries
  for each row execute function sandbox_assign_sent_seq();

drop index sandbox_deliveries_relay;
create index sandbox_deliveries_relay on sandbox_deliveries (key_id, sent_seq) where status = 'sent';
