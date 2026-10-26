begin;

alter table public.recipes
  rename column image_url to cover_image_path;
alter table public.recipes
  rename column image_alt to cover_image_alt;

create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (length(trim(slug)) > 0),
  title text not null check (length(trim(title)) > 0),
  excerpt text not null default '',
  category text not null default 'Kitchen notes',
  body text not null default '',
  cover_image_path text,
  cover_image_alt text not null default '',
  status text not null default 'draft'
    check (status in ('draft', 'published')),
  constraint blog_posts_published_have_date
    check (status <> 'published' or published_at is not null),
  created_by uuid references public.profiles (id) on delete set null
    default auth.uid(),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index blog_posts_status_published_at_idx
  on public.blog_posts (status, published_at desc);

create function public.set_blog_post_timestamps()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;

create trigger blog_posts_set_timestamps
  before insert or update on public.blog_posts
  for each row execute function public.set_blog_post_timestamps();

create function public.is_current_user_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'admin'
  );
$$;

revoke all on function public.is_current_user_admin()
  from public, anon, authenticated;
grant execute on function public.is_current_user_admin()
  to anon, authenticated;

alter table public.blog_posts enable row level security;
revoke all on table public.blog_posts from public, anon, authenticated;
grant select on table public.blog_posts to anon, authenticated;
grant insert (
  slug, title, excerpt, category, body, cover_image_path,
  cover_image_alt, status, published_at
) on public.blog_posts to authenticated;
grant update (
  slug, title, excerpt, category, body, cover_image_path,
  cover_image_alt, status, published_at
) on public.blog_posts to authenticated;
grant delete on table public.blog_posts to authenticated;

create policy "Anyone can read published blog posts"
  on public.blog_posts
  for select
  to anon, authenticated
  using (status = 'published');

create policy "Admins can manage blog posts"
  on public.blog_posts
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

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'culinary-covers',
  'culinary-covers',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Admins can upload culinary cover images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'culinary-covers'
    and exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'admin'
    )
  );

create policy "Published content and admins can read cover images"
  on storage.objects
  for select
  to anon, authenticated
  using (
    bucket_id = 'culinary-covers'
    and (
      (select public.is_current_user_admin())
      or exists (
        select 1
        from public.recipes
        where recipes.cover_image_path = storage.objects.name
          and recipes.status = 'published'
      )
      or exists (
        select 1
        from public.blog_posts
        where blog_posts.cover_image_path = storage.objects.name
          and blog_posts.status = 'published'
      )
    )
  );

create policy "Cover reads are limited to published content or admins"
  on storage.objects
  as restrictive
  for select
  to anon, authenticated
  using (
    bucket_id <> 'culinary-covers'
    or (select public.is_current_user_admin())
    or exists (
      select 1
      from public.recipes
      where recipes.cover_image_path = storage.objects.name
        and recipes.status = 'published'
    )
    or exists (
      select 1
      from public.blog_posts
      where blog_posts.cover_image_path = storage.objects.name
        and blog_posts.status = 'published'
    )
  );

create policy "Admins can update culinary cover images"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'culinary-covers'
    and exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'admin'
    )
  )
  with check (
    bucket_id = 'culinary-covers'
    and exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'admin'
    )
  );

create policy "Only admins can upload to culinary covers"
  on storage.objects
  as restrictive
  for insert
  to authenticated
  with check (
    bucket_id <> 'culinary-covers'
    or (select public.is_current_user_admin())
  );

create policy "Only admins can update culinary covers"
  on storage.objects
  as restrictive
  for update
  to authenticated
  using (
    bucket_id <> 'culinary-covers'
    or (select public.is_current_user_admin())
  )
  with check (
    bucket_id <> 'culinary-covers'
    or (select public.is_current_user_admin())
  );

create policy "Admins can delete culinary cover images"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'culinary-covers'
    and exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'admin'
    )
  );

create policy "Only admins can delete culinary covers"
  on storage.objects
  as restrictive
  for delete
  to authenticated
  using (
    bucket_id <> 'culinary-covers'
    or (select public.is_current_user_admin())
  );

commit;
