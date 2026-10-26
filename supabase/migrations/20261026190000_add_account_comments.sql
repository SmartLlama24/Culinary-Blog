begin;

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid references public.recipes (id) on delete cascade,
  blog_post_id uuid references public.blog_posts (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  author_display_name text not null,
  body text not null
    check (length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comments_exactly_one_content
    check (num_nonnulls(recipe_id, blog_post_id) = 1)
);

create index comments_recipe_thread_idx
  on public.comments (recipe_id, created_at, id)
  where recipe_id is not null;
create index comments_blog_post_thread_idx
  on public.comments (blog_post_id, created_at, id)
  where blog_post_id is not null;
create index comments_author_idx on public.comments (author_id);

alter table public.comments enable row level security;
revoke all on table public.comments from public, anon, authenticated;
grant select on table public.comments to anon, authenticated;
grant insert (recipe_id, blog_post_id, body)
  on public.comments to authenticated;
grant update (body) on public.comments to authenticated;
grant delete on public.comments to authenticated;

create policy "Anyone can read comments on published content"
  on public.comments
  for select
  to anon, authenticated
  using (
    (
      recipe_id is not null
      and exists (
        select 1 from public.recipes
        where recipes.id = comments.recipe_id
          and recipes.status = 'published'
      )
    )
    or (
      blog_post_id is not null
      and exists (
        select 1 from public.blog_posts
        where blog_posts.id = comments.blog_post_id
          and blog_posts.status = 'published'
      )
    )
  );

create policy "Authenticated users can comment on published content"
  on public.comments
  for insert
  to authenticated
  with check (
    author_id = (select auth.uid())
    and (
      (
        recipe_id is not null
        and exists (
          select 1 from public.recipes
          where recipes.id = comments.recipe_id
            and recipes.status = 'published'
        )
      )
      or (
        blog_post_id is not null
        and exists (
          select 1 from public.blog_posts
          where blog_posts.id = comments.blog_post_id
            and blog_posts.status = 'published'
        )
      )
    )
  );

create policy "Authors can update their own comments"
  on public.comments
  for update
  to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

create policy "Authors can delete their own comments"
  on public.comments
  for delete
  to authenticated
  using (author_id = (select auth.uid()));

create function public.set_comment_author_and_timestamp()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.author_id := (select auth.uid());
    if new.author_id is null then
      raise exception 'A signed-in user is required to post a comment';
    end if;

    select coalesce(
      nullif(btrim(profiles.display_name), ''),
      'Community member'
    )
    into new.author_display_name
    from public.profiles
    where profiles.id = new.author_id;

    if new.author_display_name is null then
      new.author_display_name := 'Community member';
    end if;
  end if;

  if tg_op = 'INSERT' then
    new.updated_at := new.created_at;
  else
    new.updated_at := now();
  end if;
  return new;
end;
$$;

revoke all on function public.set_comment_author_and_timestamp()
  from public, anon, authenticated;

create trigger comments_set_author_and_timestamp
  before insert or update on public.comments
  for each row
  execute function public.set_comment_author_and_timestamp();

commit;
