-- CCEMS Stage 1: protected roles, department membership, and devices.

create table public.roles (
  id uuid primary key default extensions.gen_random_uuid(),
  code text not null unique check (code in ('field_worker', 'supervisor', 'estate_manager', 'admin')),
  name text not null unique,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.employee_roles (
  employee_id uuid not null references public.employees (id) on delete restrict,
  role_id uuid not null references public.roles (id) on delete restrict,
  assigned_at timestamptz not null default now(),
  assigned_by uuid references auth.users (id) on delete set null,
  primary key (employee_id, role_id)
);

create table public.employee_departments (
  employee_id uuid not null references public.employees (id) on delete restrict,
  department_id uuid not null references public.departments (id) on delete restrict,
  is_supervisor boolean not null default false,
  assigned_at timestamptz not null default now(),
  assigned_by uuid references auth.users (id) on delete set null,
  primary key (employee_id, department_id)
);

create table public.devices (
  id uuid primary key default extensions.gen_random_uuid(),
  device_identifier uuid not null unique default extensions.gen_random_uuid(),
  friendly_name text not null check (char_length(trim(friendly_name)) between 2 and 160),
  platform text not null check (platform in ('ios', 'android', 'windows', 'macos', 'linux', 'other')),
  assigned_employee_id uuid not null references public.employees (id) on delete restrict,
  approval_status text not null default 'pending'
    check (approval_status in ('pending', 'approved', 'revoked', 'rejected')),
  approved_by uuid references public.employees (id) on delete restrict,
  approved_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  check ((approved_by is null) = (approved_at is null)),
  check ((approval_status in ('approved', 'revoked')) = (approved_by is not null and approved_at is not null))
);

create index employee_roles_role_id_idx on public.employee_roles (role_id);
create index employee_departments_department_id_idx on public.employee_departments (department_id, is_supervisor);
create index devices_assigned_employee_id_idx on public.devices (assigned_employee_id, approval_status);

create trigger roles_set_updated_at before update on public.roles
for each row execute function app_private.set_updated_at();
create trigger devices_set_updated_at before update on public.devices
for each row execute function app_private.set_updated_at();

insert into public.roles (code, name) values
  ('field_worker', 'Field Worker'),
  ('supervisor', 'Supervisor'),
  ('estate_manager', 'Estate Manager'),
  ('admin', 'Admin');

insert into public.departments (code, name) values
  ('heritage_eggs', 'Heritage Eggs'),
  ('animals_production', 'Animals & Production'),
  ('land_crops', 'Land & Crops'),
  ('maintenance_fleet', 'Maintenance & Fleet'),
  ('estate_operations', 'Estate Operations'),
  ('people_training', 'People & Training');

insert into public.locations (reference, name, department_id, location_type)
select seed.reference, seed.name, d.id, seed.location_type
from (values
  ('HE-H01', 'House 1 — Spring Heritage', 'heritage_eggs', 'heritage_house'),
  ('HE-H02', 'House 2 — Summer Heritage', 'heritage_eggs', 'heritage_house'),
  ('HE-H03', 'House 3 — Harvest Heritage', 'heritage_eggs', 'heritage_house'),
  ('HE-H04', 'House 4 — Christmas Estate Heritage', 'heritage_eggs', 'heritage_house'),
  ('HE-H05', 'House 5 — Royal Estate / Heritage Reserve', 'heritage_eggs', 'heritage_house'),
  ('HE-CP01', 'Collection Pavilion', 'heritage_eggs', 'building'),
  ('LIV-CB01', 'Jersey Cow Barns', 'animals_production', 'building'),
  ('LIV-MP01', 'Milking Parlour', 'animals_production', 'building'),
  ('LIV-YB01', 'Youngstock Barns', 'animals_production', 'building'),
  ('LIV-DGP01', 'Dairy Grazing Paddocks', 'animals_production', 'pasture'),
  ('LIV-JYG01', 'Jersey Youngstock Grazing', 'animals_production', 'pasture'),
  ('LIV-HEV01', 'Heritage Egg Village', 'animals_production', 'other'),
  ('LIV-HBC01', 'Heritage Breeding Centre', 'animals_production', 'building'),
  ('LIV-LM01', 'Lambing Meadow', 'animals_production', 'pasture'),
  ('LIV-SF01', 'Heritage Sheep Fold & Pens', 'animals_production', 'other'),
  ('LIV-SNP01', 'Sheep Nursery Paddocks', 'animals_production', 'pasture'),
  ('EST-OY01', 'Estate Operations Yard', 'estate_operations', 'yard'),
  ('LIV-OTHER', 'Other livestock area', 'animals_production', 'other'),
  ('EST-OTHER', 'Other estate area', 'estate_operations', 'other')
) as seed(reference, name, department_code, location_type)
join public.departments d on d.code = seed.department_code;

insert into public.livestock_groups (reference, name, species) values
  ('LIV-CATTLE', 'Cattle', 'Cattle'),
  ('LIV-SHEEP', 'Sheep', 'Sheep'),
  ('LIV-POULTRY', 'Poultry', 'Poultry'),
  ('LIV-MIXED', 'Mixed livestock', 'Mixed');

insert into public.livestock_group_locations (livestock_group_id, location_id)
select g.id, l.id
from public.livestock_groups g
join public.locations l on
  (g.reference = 'LIV-CATTLE' and l.reference in ('LIV-CB01','LIV-MP01','LIV-YB01','LIV-DGP01','LIV-JYG01','EST-OY01','LIV-OTHER'))
  or (g.reference = 'LIV-SHEEP' and l.reference in ('LIV-LM01','LIV-SF01','LIV-SNP01','EST-OY01','LIV-OTHER'))
  or (g.reference = 'LIV-POULTRY' and l.reference in ('LIV-HEV01','LIV-HBC01','EST-OY01','LIV-OTHER'))
  or (g.reference = 'LIV-MIXED' and l.reference in ('LIV-CB01','LIV-MP01','LIV-YB01','LIV-DGP01','LIV-JYG01','LIV-HEV01','LIV-HBC01','LIV-LM01','LIV-SF01','LIV-SNP01','EST-OY01','LIV-OTHER'));
