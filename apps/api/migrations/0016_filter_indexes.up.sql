-- Filter indexes: every column a list filters or groups on, led by the column and ending in the list order.
create index routes_country_idx on routes (country, updated_at desc, id desc)
  where deleted_at is null and moderation = 'visible';
create index routes_stack_idx on routes (stack, updated_at desc, id desc)
  where deleted_at is null and moderation = 'visible';
create index routes_language_idx on routes (language, updated_at desc, id desc)
  where deleted_at is null and moderation = 'visible';

create index threads_topic_idx on threads (topic, last_activity_at desc, id desc) where status = 'visible';
create index threads_country_idx on threads (country, last_activity_at desc, id desc) where status = 'visible';
create index threads_stack_idx on threads (stack, last_activity_at desc, id desc) where status = 'visible';
create index threads_language_idx on threads (language, last_activity_at desc, id desc) where status = 'visible';
create index threads_service_idx on threads (service_id) where service_id is not null;
create index threads_accepted_reply_idx on threads (accepted_reply_id) where accepted_reply_id is not null;
create index threads_hidden_idx on threads (last_activity_at desc, id desc) where status = 'hidden';

create index users_country_idx on users (country);
create index checks_checked_at_idx on checks (checked_at);
create index simulator_votes_user_idx on simulator_votes (user_id);
create index sandbox_deliveries_key_idx on sandbox_deliveries (key_id);
create index service_countries_route_idx on service_countries (route_id) where route_id is not null;
create index service_proposals_decided_by_idx on service_proposals (decided_by) where decided_by is not null;
create index route_versions_author_idx on route_versions (author_id) where author_id is not null;
create index reports_user_idx on reports (user_id);
create index post_reports_user_idx on post_reports (user_id);
