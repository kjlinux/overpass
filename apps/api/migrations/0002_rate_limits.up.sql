-- Shared rate-limit counters, so every API instance enforces the same budgets.
create table rate_limit_counters (
  key text primary key,
  count integer not null,
  reset_at timestamptz not null
);

create index rate_limit_counters_reset_at_idx on rate_limit_counters (reset_at);
