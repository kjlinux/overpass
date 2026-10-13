alter table services add column countries char(2)[] not null default '{}';

update services set countries = coalesce(
  (select array_agg(country order by country) from service_countries where service_id = services.id),
  '{}'
);

drop table service_countries;
