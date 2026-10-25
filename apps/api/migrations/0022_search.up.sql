-- Global search: accent-blind configurations, a search column per searchable table, trigram titles.
create extension if not exists unaccent;
create extension if not exists pg_trgm;

create text search configuration overpass_french (copy = french);
alter text search configuration overpass_french
  alter mapping for hword, hword_part, word with unaccent, french_stem;
create text search configuration overpass_english (copy = english);
alter text search configuration overpass_english
  alter mapping for hword, hword_part, word with unaccent, english_stem;
create text search configuration overpass_simple (copy = simple);
alter text search configuration overpass_simple
  alter mapping for hword, hword_part, word with unaccent, simple;

alter table routes drop column search;
alter table routes add column search tsvector generated always as (
  setweight(to_tsvector(case language when 'fr' then 'overpass_french'::regconfig when 'en' then 'overpass_english'::regconfig else 'overpass_simple'::regconfig end, title), 'A')
  || setweight(to_tsvector(case language when 'fr' then 'overpass_french'::regconfig when 'en' then 'overpass_english'::regconfig else 'overpass_simple'::regconfig end, content), 'B')
) stored;
create index routes_search_idx on routes using gin (search);

alter table posts add column search tsvector generated always as (
  setweight(to_tsvector(case language when 'fr' then 'overpass_french'::regconfig when 'en' then 'overpass_english'::regconfig else 'overpass_simple'::regconfig end, title), 'A')
  || setweight(to_tsvector(case language when 'fr' then 'overpass_french'::regconfig when 'en' then 'overpass_english'::regconfig else 'overpass_simple'::regconfig end, summary), 'B')
  || setweight(to_tsvector(case language when 'fr' then 'overpass_french'::regconfig when 'en' then 'overpass_english'::regconfig else 'overpass_simple'::regconfig end, content), 'C')
) stored;
create index posts_search_idx on posts using gin (search);

alter table threads add column search tsvector generated always as (
  setweight(to_tsvector(case language when 'fr' then 'overpass_french'::regconfig when 'en' then 'overpass_english'::regconfig else 'overpass_simple'::regconfig end, title), 'A')
  || setweight(to_tsvector(case language when 'fr' then 'overpass_french'::regconfig when 'en' then 'overpass_english'::regconfig else 'overpass_simple'::regconfig end, content), 'B')
) stored;
create index threads_search_idx on threads using gin (search);

-- A reply has no language of its own: the simple configuration still folds accents and case.
alter table replies add column search tsvector generated always as (
  to_tsvector('overpass_simple'::regconfig, content)
) stored;
create index replies_search_idx on replies using gin (search);

create index posts_title_trgm_idx on posts using gin (lower(title) gin_trgm_ops);
create index threads_title_trgm_idx on threads using gin (lower(title) gin_trgm_ops);
create index routes_title_trgm_idx on routes using gin (lower(title) gin_trgm_ops);
