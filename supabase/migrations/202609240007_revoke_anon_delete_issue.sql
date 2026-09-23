revoke execute on function public.delete_issue(uuid) from anon;
grant execute on function public.delete_issue(uuid) to authenticated;
