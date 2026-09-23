-- Admin-only report deletion. The database function is the authorization boundary.
create or replace function public.delete_issue(p_issue_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorised';
  end if;

  delete from public.issues where id = p_issue_id;
end;
$$;

revoke all on function public.delete_issue(uuid) from public;
grant execute on function public.delete_issue(uuid) to authenticated;
