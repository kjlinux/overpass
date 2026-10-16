-- Blog module: admin news and member blogs, comments, stars, follows, reports and suspensions.
create table posts (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('news', 'member')),
  author_id uuid references users (id) on delete set null,
  language text not null check (language ~ '^[a-z]{2}$'),
  translation_group uuid not null default gen_random_uuid(),
  slug text not null check (slug ~ '^[a-z0-9][a-z0-9-]{0,89}$'),
  category text not null check (category in ('tech-news', 'tutorials', 'portraits')),
  title text not null check (char_length(title) between 8 and 140),
  summary text not null check (char_length(summary) between 1 and 300),
  content text not null check (char_length(content) between 1 and 50000),
  status text not null default 'draft' check (status in ('draft', 'published')),
  moderation text not null default 'visible' check (moderation in ('visible', 'hidden', 'blocked')),
  published_at timestamptz,
  star_count integer not null default 0 check (star_count >= 0),
  comment_count integer not null default 0 check (comment_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint posts_published_dated check (status = 'draft' or published_at is not null),
  constraint posts_slug_per_language unique (language, slug),
  constraint posts_one_per_language unique (translation_group, language)
);

-- Partial indexes over listed posts serve the recent feed, the blogs and the top rated part of the feed.
create index posts_recent_idx on posts (published_at desc, id desc)
  where status = 'published' and moderation = 'visible';
create index posts_author_listed_idx on posts (author_id, published_at desc, id desc)
  where status = 'published' and moderation = 'visible';
create index posts_stars_idx on posts (star_count desc, published_at desc, id desc)
  where status = 'published' and moderation = 'visible';
create index posts_author_idx on posts (author_id, updated_at desc);

create table post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts (id) on delete cascade,
  author_id uuid not null references users (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 5000),
  moderation text not null default 'visible' check (moderation in ('visible', 'hidden', 'blocked')),
  created_at timestamptz not null default now()
);

create index post_comments_post_idx on post_comments (post_id, created_at, id);
create index post_comments_author_idx on post_comments (author_id);

-- The primary key is the "one star per account and per post" rule.
create table post_stars (
  post_id uuid not null references posts (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index post_stars_user_idx on post_stars (user_id);

create table follows (
  follower_id uuid not null references users (id) on delete cascade,
  followee_id uuid not null references users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  constraint follows_not_self check (follower_id <> followee_id)
);

create index follows_followee_idx on follows (followee_id);

create table post_reports (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('post', 'comment')),
  target_id uuid not null,
  user_id uuid not null references users (id) on delete cascade,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create unique index post_reports_one_open_per_user on post_reports (kind, target_id, user_id)
  where resolved_at is null;
create index post_reports_open_idx on post_reports (kind, target_id) where resolved_at is null;

create table blog_suspensions (
  user_id uuid primary key references users (id) on delete cascade,
  suspended_by uuid references users (id) on delete set null,
  suspended_at timestamptz not null default now()
);
