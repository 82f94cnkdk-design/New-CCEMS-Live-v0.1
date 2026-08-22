-- Crown & Cross Asset Register foundation and Equipment Inspection linkage.
-- The register deliberately starts empty; authorised managers add real estate assets.

create table public.assets (
  id uuid primary key default extensions.gen_random_uuid(),
  asset_number text not null unique default app_private.new_reference('AST'),
  category text not null check (category in (
    'vehicle', 'tractor_machinery', 'implement_attachment', 'powered_equipment',
    'hand_tool', 'livestock_equipment', 'egg_equipment', 'estate_infrastructure',
    'safety_equipment', 'it_device', 'other'
  )),
  name text not null check (char_length(trim(name)) between 2 and 160),
  registration_number text,
  make text,
  model text,
  serial_number text,
  department_id uuid not null references public.departments (id) on delete restrict,
  location_id uuid references public.locations (id) on delete restrict,
  responsible_employee_id uuid references public.employees (id) on delete restrict,
  purchase_date date,
  next_service_date date,
  next_inspection_date date,
  status text not null default 'active' check (status in ('active', 'unavailable', 'under_repair', 'retired')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_at timestamptz not null default now(),
  check (registration_number is null or char_length(trim(registration_number)) between 2 and 24),
  check (serial_number is null or char_length(trim(serial_number)) between 2 and 120)
);

create unique index assets_registration_number_unique_idx
  on public.assets (lower(registration_number))
  where registration_number is not null;
create unique index assets_serial_number_unique_idx
  on public.assets (lower(serial_number))
  where serial_number is not null;
create index assets_department_status_idx on public.assets (department_id, status, name);
create index assets_location_id_idx on public.assets (location_id) where location_id is not null;
create index assets_responsible_employee_id_idx on public.assets (responsible_employee_id) where responsible_employee_id is not null;

create trigger assets_set_updated_at before update on public.assets
for each row execute function app_private.set_updated_at();

alter table public.assets enable row level security;
revoke all on table public.assets from public, anon, authenticated;
grant select, insert, update on public.assets to authenticated;

create policy assets_read on public.assets for select to authenticated
using (
  responsible_employee_id = app_private.current_employee_id()
  or app_private.can_access_department(department_id, false)
);

create policy assets_create on public.assets for insert to authenticated
with check (
  created_by = (select auth.uid())
  and app_private.can_access_department(department_id, true)
);

create policy assets_manage on public.assets for update to authenticated
using (app_private.can_access_department(department_id, true))
with check (app_private.can_access_department(department_id, true));

alter table public.safety_records
add column asset_id uuid references public.assets (id) on delete restrict;
create index safety_records_asset_id_idx on public.safety_records (asset_id) where asset_id is not null;

drop function public.submit_safety_record(text, text, text, jsonb);

create function public.submit_safety_record(
  p_client_reference text,
  p_form_type text,
  p_department_code text,
  p_fields jsonb,
  p_asset_id uuid default null
)
returns table (record_id uuid, record_reference text, record_created_at timestamptz)
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_employee_id uuid;
  v_department_id uuid;
  v_id uuid;
  v_reference text;
  v_created_at timestamptz;
begin
  if p_client_reference !~ '^CC-[A-Z]+-[0-9]{4}-[0-9]{6,20}$' then
    raise exception 'Client reference is invalid';
  end if;
  if p_form_type not in ('risk_assessment', 'equipment_check', 'coshh', 'training', 'incident') then
    raise exception 'Safety form type is invalid';
  end if;
  if jsonb_typeof(p_fields) is distinct from 'object' or p_fields = '{}'::jsonb then
    raise exception 'Safety fields must be supplied as a non-empty object';
  end if;
  if exists (
    select 1 from jsonb_object_keys(p_fields) as field_key(key)
    where field_key.key !~ '^field_[0-9]{1,2}$'
  ) then
    raise exception 'Safety field key is invalid';
  end if;
  if (p_form_type = 'equipment_check') is distinct from (p_asset_id is not null) then
    raise exception 'Equipment inspections require one registered asset; other safety forms must not supply an asset';
  end if;

  v_employee_id := app_private.current_employee_id();
  if v_employee_id is null then
    raise exception 'Authenticated user is not an active CCEMS employee';
  end if;

  select id into v_department_id
  from public.departments
  where code = p_department_code and active;
  if v_department_id is null then
    raise exception 'Approved department was not found';
  end if;
  if p_asset_id is not null and not exists (
    select 1 from public.assets
    where id = p_asset_id and status <> 'retired'
  ) then
    raise exception 'The selected asset is unavailable or not authorised for this employee';
  end if;

  select id, reference, created_at into v_id, v_reference, v_created_at
  from public.safety_records
  where client_reference = p_client_reference and submitter_id = v_employee_id;
  if v_id is not null then
    return query select v_id, v_reference, v_created_at;
    return;
  end if;

  insert into public.safety_records (
    client_reference, form_type, department_id, submitter_id, asset_id, review_status, created_by
  ) values (
    p_client_reference, p_form_type, v_department_id, v_employee_id, p_asset_id, 'draft', (select auth.uid())
  )
  returning id, reference, created_at into v_id, v_reference, v_created_at;

  insert into public.safety_record_fields (safety_record_id, field_key, field_value, created_by)
  select v_id, field.key, field.value, (select auth.uid())
  from jsonb_each(p_fields) as field;

  update public.safety_records set review_status = 'submitted' where id = v_id;
  return query select v_id, v_reference, v_created_at;
end;
$$;

revoke all on function public.submit_safety_record(text, text, text, jsonb, uuid) from public, anon;
grant execute on function public.submit_safety_record(text, text, text, jsonb, uuid) to authenticated;
