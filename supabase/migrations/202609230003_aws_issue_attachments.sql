-- AWS-backed issue attachments. Files stay private in S3; this table stores
-- ownership and metadata so signed URLs can be issued safely.
create table public.issue_attachments (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.issues(id) on delete cascade,
  uploader_id uuid not null references public.profiles(id) on delete cascade,
  object_key text not null unique,
  content_type text not null check (content_type in ('image/jpeg', 'image/png', 'image/webp')),
  byte_size bigint not null check (byte_size > 0 and byte_size <= 10485760),
  created_at timestamptz not null default now()
);

create index issue_attachments_issue_idx on public.issue_attachments (issue_id, created_at desc);

alter table public.issue_attachments enable row level security;

create policy "reporters read own attachments" on public.issue_attachments
for select to authenticated
using (
  uploader_id = (select auth.uid())
  or exists (
    select 1 from public.issues i
    where i.id = issue_id
      and (i.department_id = public.staff_department_id() or public.is_admin())
  )
);

create policy "reporters create own attachments" on public.issue_attachments
for insert to authenticated
with check (
  uploader_id = (select auth.uid())
  and exists (
    select 1 from public.issues i
    where i.id = issue_id and i.reporter_id = (select auth.uid())
  )
);
