alter table sandbox_keys drop constraint sandbox_keys_webhook_url_check;
alter table sandbox_keys add constraint sandbox_keys_webhook_url_check check (webhook_url ~ '^https?://');
