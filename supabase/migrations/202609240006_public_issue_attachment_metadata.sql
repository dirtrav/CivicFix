-- Object keys do not grant access to the private bucket; they let the API mint short-lived photo URLs.
create policy "public reads attachments for public reports"
on public.issue_attachments
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.issues i
    where i.id = issue_attachments.issue_id
      and i.is_public
  )
);
