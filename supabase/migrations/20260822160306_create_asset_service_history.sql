-- Crown & Cross asset servicing, inspection, repair and defect history.

alter table public.assets drop constraint assets_status_check;
alter table public.assets add constraint assets_status_check
  check (status in ('active', 'unavailable', 'under_repair', 'isolated', 'retired'));

create table public.asset_service_records (
  id uuid primary key default extensions.gen_random_uuid(),
  reference text not null unique default app_private.new_reference('ASV'),
  asset_id uuid not null references public.assets (id) on delete restrict,
  event_type text not null check (event_type in ('service', 'inspection', 'repair', 'defect', 'status_change')),
  occurred_on date not null default current_date,
  provider text,
  summary text not null check (char_length(trim(summary)) between 2 and 240),
  work_performed text not null default '',
  meter_reading numeric(12,2) check (meter_reading is null or meter_reading >= 0),
  meter_unit text check (meter_unit is null or meter_unit in ('hours', 'miles', 'kilometres', 'cycles')),
  cost numeric(12,2) check (cost is null or cost >= 0),
  resulting_status text not null check (resulting_status in ('active', 'unavailable', 'under_repair', 'isolated', 'retired')),
  next_service_date date,
  next_inspection_date date,
  recorded_by_employee_id uuid not null references public.employees (id) on delete restrict,
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_at timestamptz not null default now()
);

create index asset_service_records_asset_created_idx
  on public.asset_service_records (asset_id, occurred_on desc, created_at desc);
create index asset_service_records_employee_created_idx
  on public.asset_service_records (recorded_by_employee_id, created_at desc);
create index assets_next_service_due_idx
  on public.assets (next_service_date) where status <> 'retired' and next_service_date is not null;
create index assets_next_inspection_due_idx
  on public.assets (next_inspection_date) where status <> 'retired' and next_inspection_date is not null;

create trigger asset_service_records_set_updated_at
before update on public.asset_service_records
for each row execute function app_private.set_updated_at();

alter table public.asset_service_records enable row level security;
revoke all on table public.asset_service_records from public, anon, authenticated;
grant select, insert, update on public.asset_service_records to authenticated;

create policy asset_service_records_read on public.asset_service_records
for select to authenticated
using (
  exists (
    select 1 from public.assets asset
    where asset.id = asset_service_records.asset_id
      and (
        asset.responsible_employee_id = app_private.current_employee_id()
        or app_private.can_access_department(asset.department_id, false)
      )
  )
);

create policy asset_service_records_create on public.asset_service_records
for insert to authenticated
with check (
  recorded_by_employee_id = app_private.current_employee_id()
  and created_by = (select auth.uid())
  and exists (
    select 1 from public.assets asset
    where asset.id = asset_service_records.asset_id
      and app_private.can_access_department(asset.department_id, false)
  )
);

create policy asset_service_records_manage on public.asset_service_records
for update to authenticated
using (
  exists (
    select 1 from public.assets asset
    where asset.id = asset_service_records.asset_id
      and app_private.can_access_department(asset.department_id, true)
  )
)
with check (
  exists (
    select 1 from public.assets asset
    where asset.id = asset_service_records.asset_id
      and app_private.can_access_department(asset.department_id, true)
  )
);

create or replace function app_private.apply_asset_service_record()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.assets
  set status = new.resulting_status,
      next_service_date = coalesce(new.next_service_date, next_service_date),
      next_inspection_date = coalesce(new.next_inspection_date, next_inspection_date),
      updated_at = now()
  where id = new.asset_id;
  return new;
end;
$$;
revoke all on function app_private.apply_asset_service_record() from public, anon, authenticated;

create trigger apply_asset_service_record
after insert on public.asset_service_records
for each row execute function app_private.apply_asset_service_record();

create trigger audit_assets
after insert or update on public.assets
for each row execute function app_private.write_audit_event();
create trigger audit_asset_service_records
after insert or update on public.asset_service_records
for each row execute function app_private.write_audit_event();
