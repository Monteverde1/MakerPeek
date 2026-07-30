-- Subscriptions keyed by extension install UUID (Stripe Payment Link client_reference_id)

create table if not exists subscriptions (
  id uuid default gen_random_uuid() primary key,
  client_reference_id text unique not null,
  email text,
  status text not null default 'inactive',
  stripe_customer_id text,
  updated_at timestamptz default now()
);

alter table subscriptions enable row level security;

-- Edge function / service role writes
create policy "Service role full access" on subscriptions for all using (true) with check (true);

-- Extension reads status by client_reference_id (anon key + PostgREST filter)
create policy "Anon read subscriptions" on subscriptions for select to anon using (true);
