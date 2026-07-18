-- search_history setup for Supabase/Postgres
-- Run in Supabase SQL Editor with a privileged role.

create extension if not exists pgcrypto;

create table if not exists public.search_history (
  search_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  search_term text not null,
  filter_json jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);

create index if not exists idx_search_history_user_created
  on public.search_history (user_id, created_at desc);

alter table public.search_history enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'search_history'
      and policyname = 'users_own_searches'
  ) then
    create policy users_own_searches
      on public.search_history
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

-- Allow PostgREST roles to see/use the table.
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, delete on public.search_history to authenticated, service_role;
grant select on public.search_history to anon;
