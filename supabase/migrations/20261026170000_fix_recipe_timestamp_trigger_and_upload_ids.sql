begin;

create or replace function public.set_recipe_row_timestamps()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();

  if tg_table_name = 'recipes' then
    if new.status = 'published' and new.published_at is null then
      new.published_at := now();
    end if;
  end if;

  return new;
end;
$$;

grant insert (id) on public.recipes to authenticated;

commit;
