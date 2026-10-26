begin;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'auth'
      and table_name = 'users'
      and column_name = 'id'
      and udt_name = 'uuid'
  ) then
    raise exception 'Expected auth.users.id to exist with type uuid';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'id'
      and udt_name = 'uuid'
  ) then
    raise exception 'Expected public.profiles.id to exist with type uuid';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'recipes'
      and column_name = 'id'
      and udt_name = 'uuid'
  ) then
    raise exception 'Expected public.recipes.id to exist with type uuid';
  end if;
end;
$$;

create table public.user_favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint user_favorites_pkey primary key (user_id, recipe_id)
);

create index user_favorites_recipe_id_idx
  on public.user_favorites (recipe_id);

alter table public.user_favorites enable row level security;

revoke all on table public.user_favorites from public, anon, authenticated;
grant select, insert, delete on table public.user_favorites to authenticated;

create policy "Users can view their own favorites"
  on public.user_favorites
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can add their own favorites"
  on public.user_favorites
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can remove their own favorites"
  on public.user_favorites
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

commit;
