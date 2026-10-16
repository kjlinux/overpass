drop table reports;
drop table reply_votes;
alter table threads drop constraint threads_accepted_reply_fkey;
drop table replies;
drop table threads;
drop table topics;
