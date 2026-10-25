drop index if exists routes_title_trgm_idx;
drop index if exists threads_title_trgm_idx;
drop index if exists posts_title_trgm_idx;

alter table replies drop column search;
alter table threads drop column search;
alter table posts drop column search;

alter table routes drop column search;
alter table routes add column search tsvector generated always as (
  setweight(to_tsvector(case language when 'fr' then 'french'::regconfig when 'en' then 'english'::regconfig else 'simple'::regconfig end, title), 'A')
  || setweight(to_tsvector(case language when 'fr' then 'french'::regconfig when 'en' then 'english'::regconfig else 'simple'::regconfig end, content), 'B')
) stored;
create index routes_search_idx on routes using gin (search);

drop text search configuration overpass_simple;
drop text search configuration overpass_english;
drop text search configuration overpass_french;
