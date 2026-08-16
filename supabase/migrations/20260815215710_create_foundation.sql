-- CCEMS Stage 1: foundation and approved estate reference data.
-- Review-only migration. Do not apply to a linked or production database.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;

create or replace function app_private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function app_private.set_updated_at() from public;

create table public.employees (
  id uuid primary key default extensions.gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users (id) on delete restrict,
  employee_number text not null unique check (employee_number ~ '^[A-Z0-9-]{2,32}$'),
  preferred_name text not null check (char_length(trim(preferred_name)) between 1 and 120),
  employment_status text not null default 'active'
    check (employment_status in ('active', 'inactive', 'suspended')),
  contact_email text,
  contact_phone text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.departments (
  id uuid primary key default extensions.gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9_]{2,40}$'),
  name text not null unique check (char_length(trim(name)) between 2 and 120),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.locations (
  id uuid primary key default extensions.gen_random_uuid(),
  reference text not null unique check (reference ~ '^[A-Z0-9-]{2,40}$'),
  name text not null check (char_length(trim(name)) between 2 and 160),
  department_id uuid references public.departments (id) on delete restrict,
  location_type text not null check (location_type in ('heritage_house', 'field', 'building', 'yard', 'pasture', 'other')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.livestock_groups (
  id uuid primary key default extensions.gen_random_uuid(),
  reference text not null unique check (reference ~ '^[A-Z0-9-]{2,40}$'),
  name text not null check (char_length(trim(name)) between 2 and 160),
  species text not null check (char_length(trim(species)) between 2 and 120),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.livestock_group_locations (
  livestock_group_id uuid not null references public.livestock_groups (id) on delete cascade,
  location_id uuid not null references public.locations (id) on delete restrict,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  primary key (livestock_group_id, location_id)
);

create index locations_department_id_idx on public.locations (department_id) where active;
create index livestock_group_locations_location_id_idx on public.livestock_group_locations (location_id);

create trigger employees_set_updated_at before update on public.employees
for each row execute function app_private.set_updated_at();
create trigger departments_set_updated_at before update on public.departments
for each row execute function app_private.set_updated_at();
create trigger locations_set_updated_at before update on public.locations
for each row execute function app_private.set_updated_at();
create trigger livestock_groups_set_updated_at before update on public.livestock_groups
for each row execute function app_private.set_updated_at();
