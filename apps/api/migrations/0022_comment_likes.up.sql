-- The primary key is the "one like per account and per comment" rule.
create table comment_likes (
  comment_id uuid not null references post_comments (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create index comment_likes_user_idx on comment_likes (user_id);
