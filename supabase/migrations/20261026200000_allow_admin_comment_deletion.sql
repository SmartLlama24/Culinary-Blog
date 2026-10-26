begin;

create policy "Admins can delete any comment"
  on public.comments
  for delete
  to authenticated
  using ((select public.is_current_user_admin()));

commit;
