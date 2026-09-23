-- Write history after the issue row exists so the issue_updates foreign key succeeds.
drop trigger if exists record_issue_update on public.issues;
drop function if exists public.record_issue_update();

create or replace function public.touch_issue_timestamp() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger touch_issue_timestamp before update on public.issues
for each row execute function public.touch_issue_timestamp();

create or replace function public.record_issue_history() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.issue_updates(issue_id, author_id, previous_status, status, public_message)
    values (new.id, new.reporter_id, null, new.status, 'Report received.');
  elsif new.status is distinct from old.status then
    insert into public.issue_updates(issue_id, author_id, previous_status, status)
    values (new.id, auth.uid(), old.status, new.status);
  end if;
  return new;
end;
$$;
create trigger record_issue_history after insert or update on public.issues
for each row execute function public.record_issue_history();
