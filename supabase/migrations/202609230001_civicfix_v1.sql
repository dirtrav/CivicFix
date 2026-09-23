-- CivicFix v1: schema, routing, public-safe view, and row-level security.
create extension if not exists pgcrypto;

create type public.user_role as enum ('citizen', 'staff', 'admin');
create type public.issue_status as enum ('new', 'assigned', 'in_progress', 'resolved', 'rejected', 'needs_information');

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  icon text not null,
  department_id uuid references public.departments(id),
  sort_order smallint not null default 100,
  is_active boolean not null default true
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role public.user_role not null default 'citizen',
  department_id uuid references public.departments(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_requires_department check (role not in ('staff') or department_id is not null)
);

create table public.issues (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique default ('CF-AP-' || lpad((floor(random() * 999999)::int)::text, 6, '0')),
  reporter_id uuid not null references public.profiles(id),
  category_id uuid not null references public.categories(id),
  department_id uuid references public.departments(id),
  title text not null check (char_length(title) between 5 and 140),
  description text not null check (char_length(description) between 10 and 2000),
  status public.issue_status not null default 'new',
  address text not null check (char_length(address) between 5 and 300),
  latitude double precision,
  longitude double precision,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index issues_department_status_idx on public.issues (department_id, status, updated_at desc);
create index issues_reporter_idx on public.issues (reporter_id, updated_at desc);
create index issues_public_idx on public.issues (is_public, updated_at desc);

create table public.issue_updates (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.issues(id) on delete cascade,
  author_id uuid references public.profiles(id),
  previous_status public.issue_status,
  status public.issue_status not null,
  public_message text,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);
create index issue_updates_issue_idx on public.issue_updates (issue_id, created_at asc);

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
create or replace function public.staff_department_id() returns uuid language sql stable security definer set search_path = public as $$
  select department_id from public.profiles where id = auth.uid() and role in ('staff', 'admin');
$$;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.route_issue() returns trigger language plpgsql security definer set search_path = public as $$
begin
  select department_id into new.department_id from public.categories where id = new.category_id;
  return new;
end;
$$;
create trigger route_new_issue before insert or update of category_id on public.issues for each row execute procedure public.route_issue();

create or replace function public.record_issue_update() returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if tg_op = 'INSERT' then
    insert into public.issue_updates(issue_id, author_id, previous_status, status, public_message) values (new.id, new.reporter_id, null, new.status, 'Report received.');
  elsif new.status is distinct from old.status then
    insert into public.issue_updates(issue_id, author_id, previous_status, status, public_message) values (new.id, auth.uid(), old.status, new.status, null);
  end if;
  return new;
end;
$$;
create trigger record_issue_update before insert or update on public.issues for each row execute procedure public.record_issue_update();

create or replace function public.update_issue_status(p_issue_id uuid, p_status public.issue_status, p_public_message text) returns void language plpgsql security definer set search_path = public as $$
declare current_department uuid;
begin
  select department_id into current_department from public.issues where id = p_issue_id;
  if not public.is_admin() and current_department is distinct from public.staff_department_id() then raise exception 'Not authorised'; end if;
  update public.issues set status = p_status where id = p_issue_id;
  update public.issue_updates set public_message = nullif(p_public_message, '') where id = (select id from public.issue_updates where issue_id = p_issue_id order by created_at desc limit 1);
end;
$$;

create or replace view public.issues_public with (security_invoker = true) as
select i.id, i.public_id, i.title, i.description, i.status, i.address, round(i.latitude::numeric, 3)::double precision as latitude, round(i.longitude::numeric, 3)::double precision as longitude, i.created_at, i.updated_at,
  jsonb_build_object('name', c.name, 'slug', c.slug, 'icon', c.icon) as category,
  jsonb_build_object('name', d.name) as department
from public.issues i join public.categories c on c.id = i.category_id left join public.departments d on d.id = i.department_id
where i.is_public = true;

alter table public.departments enable row level security;
alter table public.categories enable row level security;
alter table public.profiles enable row level security;
alter table public.issues enable row level security;
alter table public.issue_updates enable row level security;

create policy "public can read departments" on public.departments for select using (is_active);
create policy "public can read categories" on public.categories for select using (is_active);
create policy "users read own profile" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "users update own profile" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));
create policy "public can read public issues" on public.issues for select using (is_public or reporter_id = auth.uid() or department_id = public.staff_department_id() or public.is_admin());
create policy "citizens create own issues" on public.issues for insert with check (reporter_id = auth.uid());
create policy "staff update own department issues" on public.issues for update using (department_id = public.staff_department_id() or public.is_admin());
create policy "public reads public issue updates" on public.issue_updates for select using (is_public or exists (select 1 from public.issues i where i.id = issue_id and i.reporter_id = auth.uid()) or public.is_admin());
create policy "staff create issue updates" on public.issue_updates for insert with check (public.is_admin() or exists (select 1 from public.issues i where i.id = issue_id and i.department_id = public.staff_department_id()));

insert into public.departments (name, slug) values
  ('Roads and Public Works', 'roads-public-works'), ('Electrical and Streetlights', 'electrical-streetlights'), ('Sanitation and Waste', 'sanitation-waste'), ('Water Supply', 'water-supply'), ('Drainage and Sewerage', 'drainage-sewerage'), ('Parks and Public Spaces', 'parks-public-spaces'), ('Civic Helpdesk', 'civic-helpdesk');
insert into public.categories (name, slug, icon, department_id, sort_order)
select x.name, x.slug, x.icon, d.id, x.sort_order from (values
 ('Roads & potholes','roads-potholes','construct-outline','roads-public-works',10), ('Streetlights','streetlights','bulb-outline','electrical-streetlights',20), ('Garbage & waste','garbage-waste','trash-outline','sanitation-waste',30), ('Water & drainage','water-drainage','water-outline','water-supply',40), ('Public spaces','public-spaces','leaf-outline','parks-public-spaces',50), ('Other issue','other','ellipsis-horizontal-circle-outline','civic-helpdesk',90)
) as x(name,slug,icon,department_slug,sort_order) join public.departments d on d.slug = x.department_slug;
