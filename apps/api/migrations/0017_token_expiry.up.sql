-- Personal tokens live 90 days; existing ones count from their creation.
alter table api_tokens add column expires_at timestamptz;
update api_tokens set expires_at = created_at + interval '90 days';
alter table api_tokens alter column expires_at set not null;
