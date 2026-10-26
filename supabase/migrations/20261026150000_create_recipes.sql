begin;

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (length(trim(slug)) > 0),
  title text not null check (length(trim(title)) > 0),
  excerpt text not null default '',
  category text not null default 'Seasonal',
  image_url text,
  image_alt text not null default '',
  prep_time_minutes integer not null default 0
    check (prep_time_minutes >= 0),
  cook_time_minutes integer not null default 0
    check (cook_time_minutes >= 0),
  servings integer not null check (servings > 0),
  status text not null default 'draft'
    check (status in ('draft', 'published')),
  constraint recipes_published_have_date
    check (status <> 'published' or published_at is not null),
  created_by uuid references public.profiles (id) on delete set null
    default auth.uid(),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  ingredient_name text not null check (length(trim(ingredient_name)) > 0),
  quantity numeric(10, 3) check (quantity is null or quantity >= 0),
  unit text,
  notes text,
  sort_order integer not null check (sort_order > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (recipe_id, sort_order)
);

create table public.recipe_instructions (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  instruction text not null check (length(trim(instruction)) > 0),
  step_number integer not null check (step_number > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (recipe_id, step_number)
);

create index recipes_status_published_at_idx
  on public.recipes (status, published_at desc);
create index recipe_ingredients_recipe_sort_order_idx
  on public.recipe_ingredients (recipe_id, sort_order);
create index recipe_instructions_recipe_step_idx
  on public.recipe_instructions (recipe_id, step_number);

create function public.set_recipe_row_timestamps()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  if tg_table_name = 'recipes'
    and new.status = 'published'
    and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;

create trigger recipes_set_timestamps
  before insert or update on public.recipes
  for each row execute function public.set_recipe_row_timestamps();
create trigger recipe_ingredients_set_timestamps
  before insert or update on public.recipe_ingredients
  for each row execute function public.set_recipe_row_timestamps();
create trigger recipe_instructions_set_timestamps
  before insert or update on public.recipe_instructions
  for each row execute function public.set_recipe_row_timestamps();

update public.recipes
set published_at = created_at
where status = 'published'
  and published_at is null;

alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.recipe_instructions enable row level security;

revoke all on table public.recipes from public, anon, authenticated;
revoke all on table public.recipe_ingredients from public, anon, authenticated;
revoke all on table public.recipe_instructions from public, anon, authenticated;

grant select on table public.recipes to anon, authenticated;
grant insert (
  slug, title, excerpt, category, image_url, image_alt,
  prep_time_minutes, cook_time_minutes, servings, status, published_at
) on public.recipes to authenticated;
grant update (
  slug, title, excerpt, category, image_url, image_alt,
  prep_time_minutes, cook_time_minutes, servings, status, published_at
) on public.recipes to authenticated;
grant delete on table public.recipes to authenticated;

grant select on table public.recipe_ingredients to anon, authenticated;
grant insert (
  recipe_id, ingredient_name, quantity, unit, notes, sort_order
) on public.recipe_ingredients to authenticated;
grant update (
  recipe_id, ingredient_name, quantity, unit, notes, sort_order
) on public.recipe_ingredients to authenticated;
grant delete on table public.recipe_ingredients to authenticated;

grant select on table public.recipe_instructions to anon, authenticated;
grant insert (
  recipe_id, instruction, step_number
) on public.recipe_instructions to authenticated;
grant update (
  recipe_id, instruction, step_number
) on public.recipe_instructions to authenticated;
grant delete on table public.recipe_instructions to authenticated;

create policy "Anyone can read published recipes"
  on public.recipes
  for select
  to anon, authenticated
  using (status = 'published');

create policy "Admins can manage recipes"
  on public.recipes
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'admin'
    )
  );

create policy "Anyone can read ingredients of published recipes"
  on public.recipe_ingredients
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.recipes
      where recipes.id = recipe_ingredients.recipe_id
        and recipes.status = 'published'
    )
  );

create policy "Admins can manage recipe ingredients"
  on public.recipe_ingredients
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'admin'
    )
    and exists (
      select 1
      from public.recipes
      where recipes.id = recipe_ingredients.recipe_id
    )
  );

create policy "Anyone can read instructions of published recipes"
  on public.recipe_instructions
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.recipes
      where recipes.id = recipe_instructions.recipe_id
        and recipes.status = 'published'
    )
  );

create policy "Admins can manage recipe instructions"
  on public.recipe_instructions
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'admin'
    )
    and exists (
      select 1
      from public.recipes
      where recipes.id = recipe_instructions.recipe_id
    )
  );

commit;
