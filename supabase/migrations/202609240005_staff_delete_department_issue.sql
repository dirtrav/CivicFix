-- Staff may delete reports assigned to their department; admins may delete any report.
create or replace function public.delete_issue(p_issue_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  issue_department uuid;
begin
  select department_id
  into issue_department
  from public.issues
  where id = p_issue_id;

  if not found then
    raise exception 'Report not found';
  end if;

  if not public.is_admin()
    and issue_department is distinct from public.staff_department_id() then
    raise exception 'Not authorised';
  end if;

  delete from public.issues
  where id = p_issue_id;
end;
$$;

revoke all on function public.delete_issue(uuid) from public;
grant execute on function public.delete_issue(uuid) to authenticated;
