-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New query)

create table if not exists waitlist (
  id          bigint generated always as identity primary key,
  email       text not null,
  created_at  timestamptz not null default now(),

  constraint waitlist_email_key unique (email)
);

-- Disallow all access from the browser (anon/authenticated keys).
-- Inserts go through the Next.js API route using the service role key.
alter table waitlist enable row level security;
