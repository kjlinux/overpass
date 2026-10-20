-- Webhooks go to https only; keys left on plain http fall back to the built-in receiver.
update sandbox_keys set target = 'inbox', webhook_url = null where webhook_url like 'http:%';
alter table sandbox_keys drop constraint sandbox_keys_webhook_url_check;
alter table sandbox_keys add constraint sandbox_keys_webhook_url_check check (webhook_url ~ '^https://');
