drop index sandbox_deliveries_relay;
create index sandbox_deliveries_relay on sandbox_deliveries (key_id, seq) where status = 'sent';
drop trigger sandbox_deliveries_sent_seq on sandbox_deliveries;
drop function sandbox_assign_sent_seq();
alter table sandbox_deliveries drop column sent_seq;
drop sequence sandbox_sent_seq;
