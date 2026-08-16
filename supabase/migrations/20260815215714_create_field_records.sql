-- CCEMS Stage 1: tasks, field records, attachments metadata, and audit events.

create sequence public.ccems_human_reference_seq as bigint;
revoke all on sequence public.ccems_human_reference_seq from public, anon, authenticated;

create or replace function app_private.new_reference(prefix text)
returns text
language sql
volatile
security definer
set search_path = ''
as $$
  select upper(prefix) || '-' || to_char(current_date, 'YYYYMMDD') || '-' ||
         lpad(nextval('public.ccems_human_reference_seq')::text, 7, '0');
$$;
revoke all on function app_private.new_reference(text) from public, anon, authenticated;

create table public.tasks (
  id uuid primary key default extensions.gen_random_uuid(),
  reference text not null unique default app_private.new_reference('TSK'),
  title text not null check (char_length(trim(title)) between 2 and 200),
  instructions text not null default '',
  department_id uuid not null references public.departments (id) on delete restrict,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  due_at timestamptz,
  status text not null default 'assigned' check (status in ('assigned', 'started', 'paused', 'completed', 'cancelled')),
  assignee_id uuid not null references public.employees (id) on delete restrict,
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_at timestamptz not null default now()
);

create table public.task_events (
  id uuid primary key default extensions.gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete restrict,
  event_type text not null check (event_type in ('assigned', 'started', 'paused', 'resumed', 'completed', 'cancelled', 'note')),
  notes text,
  device_id uuid references public.devices (id) on delete restrict,
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users (id) on delete restrict
);

create table public.pre_task_safety_records (
  id uuid primary key default extensions.gen_random_uuid(),
  reference text not null unique default app_private.new_reference('PTS'),
  employee_id uuid not null references public.employees (id) on delete restrict,
  department_id uuid not null references public.departments (id) on delete restrict,
  task_id uuid references public.tasks (id) on delete restrict,
  record_date date not null default current_date,
  confirmations jsonb not null check (jsonb_typeof(confirmations) = 'object'),
  status text not null default 'submitted' check (status in ('draft', 'submitted', 'reviewed', 'amended')),
  submitted_at timestamptz,
  device_id uuid references public.devices (id) on delete restrict,
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_at timestamptz not null default now(),
  check ((status = 'draft') or submitted_at is not null)
);

create table public.safety_records (
  id uuid primary key default extensions.gen_random_uuid(),
  reference text not null unique default app_private.new_reference('SAF'),
  form_type text not null check (form_type in ('risk_assessment', 'equipment_check', 'coshh', 'training', 'incident')),
  department_id uuid not null references public.departments (id) on delete restrict,
  submitter_id uuid not null references public.employees (id) on delete restrict,
  review_status text not null default 'submitted' check (review_status in ('draft', 'submitted', 'under_review', 'approved', 'changes_required', 'amended')),
  reviewer_id uuid references public.employees (id) on delete restrict,
  reviewed_at timestamptz,
  device_id uuid references public.devices (id) on delete restrict,
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_at timestamptz not null default now()
);

create table public.safety_record_fields (
  id uuid primary key default extensions.gen_random_uuid(),
  safety_record_id uuid not null references public.safety_records (id) on delete restrict,
  field_key text not null check (field_key ~ '^[a-z][a-z0-9_]{1,79}$'),
  field_value jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_at timestamptz not null default now(),
  unique (safety_record_id, field_key)
);

create table public.livestock_welfare_checks (
  id uuid primary key default extensions.gen_random_uuid(),
  reference text not null unique default app_private.new_reference('LWC'),
  livestock_group_id uuid not null,
  location_id uuid not null,
  welfare_status text not null check (welfare_status in ('good', 'monitor', 'concern', 'urgent')),
  observations text not null default '',
  check_date date not null default current_date,
  follow_up_date date,
  declaration_confirmed boolean not null check (declaration_confirmed),
  submitter_id uuid not null references public.employees (id) on delete restrict,
  review_status text not null default 'submitted' check (review_status in ('submitted', 'under_review', 'reviewed', 'action_required', 'amended')),
  device_id uuid references public.devices (id) on delete restrict,
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_at timestamptz not null default now(),
  foreign key (livestock_group_id, location_id)
    references public.livestock_group_locations (livestock_group_id, location_id) on delete restrict,
  check (follow_up_date is null or follow_up_date >= check_date)
);

create table public.egg_collections (
  id uuid primary key default extensions.gen_random_uuid(),
  reference text not null unique default app_private.new_reference('EGG'),
  location_id uuid not null references public.locations (id) on delete restrict,
  collection_name text not null check (char_length(trim(collection_name)) between 2 and 160),
  notes text not null default '',
  collection_started_at timestamptz not null,
  submitted_at timestamptz not null default now(),
  total_quantity integer not null default 0 check (total_quantity >= 0),
  submitter_id uuid not null references public.employees (id) on delete restrict,
  device_id uuid references public.devices (id) on delete restrict,
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_at timestamptz not null default now(),
  check (submitted_at >= collection_started_at)
);

create table public.egg_collection_colours (
  id uuid primary key default extensions.gen_random_uuid(),
  egg_collection_id uuid not null references public.egg_collections (id) on delete restrict,
  colour text not null check (colour in ('White / Cream', 'Ivory', 'Pale Beige', 'Tan', 'Rich Brown', 'Dark Chocolate', 'Blue', 'Blue Green', 'Olive Green', 'Speckled')),
  quantity integer not null check (quantity >= 0),
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_at timestamptz not null default now(),
  unique (egg_collection_id, colour)
);

create table public.concerns (
  id uuid primary key default extensions.gen_random_uuid(),
  reference text not null unique default app_private.new_reference('CON'),
  category text not null check (category in ('animal_welfare', 'biosecurity', 'equipment', 'health_safety', 'environment', 'other')),
  location_id uuid not null references public.locations (id) on delete restrict,
  description text not null check (char_length(trim(description)) between 5 and 5000),
  affected text,
  immediate_action text,
  urgency text not null check (urgency in ('routine', 'priority', 'urgent', 'immediate')),
  status text not null default 'submitted' check (status in ('submitted', 'acknowledged', 'investigating', 'resolved', 'closed', 'amended')),
  reporter_id uuid not null references public.employees (id) on delete restrict,
  responsible_department_id uuid not null references public.departments (id) on delete restrict,
  assigned_reviewer_id uuid references public.employees (id) on delete restrict,
  resolution_details text,
  resolved_at timestamptz,
  device_id uuid references public.devices (id) on delete restrict,
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_at timestamptz not null default now(),
  check ((status in ('resolved', 'closed')) = (resolved_at is not null))
);

create table public.record_attachments (
  id uuid primary key default extensions.gen_random_uuid(),
  record_type text not null check (record_type in ('pre_task_safety', 'safety_record', 'livestock_welfare', 'egg_collection', 'concern')),
  record_id uuid not null,
  storage_bucket text not null default 'field-record-attachments'
    check (storage_bucket = 'field-record-attachments'),
  storage_path text not null unique check (storage_path !~ '(^|/)\.\.(/|$)'),
  original_filename text not null,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  size_bytes bigint not null check (size_bytes between 1 and 10485760),
  uploaded_by uuid not null references public.employees (id) on delete restrict,
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_at timestamptz not null default now()
);

create table public.audit_events (
  id uuid primary key default extensions.gen_random_uuid(),
  actor_employee_id uuid references public.employees (id) on delete restrict,
  action text not null check (action ~ '^[A-Z][A-Z0-9_]{2,100}$'),
  record_type text not null check (char_length(record_type) between 2 and 80),
  record_id uuid,
  device_id uuid references public.devices (id) on delete restrict,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete restrict
);

create index tasks_assignee_status_idx on public.tasks (assignee_id, status, due_at);
create index tasks_department_status_idx on public.tasks (department_id, status);
create index task_events_task_created_idx on public.task_events (task_id, created_at desc);
create index pre_task_employee_created_idx on public.pre_task_safety_records (employee_id, created_at desc);
create index safety_records_department_created_idx on public.safety_records (department_id, created_at desc);
create index livestock_checks_submitter_created_idx on public.livestock_welfare_checks (submitter_id, created_at desc);
create index egg_collections_submitter_created_idx on public.egg_collections (submitter_id, created_at desc);
create index concerns_department_status_idx on public.concerns (responsible_department_id, status, created_at desc);
create index attachments_parent_idx on public.record_attachments (record_type, record_id);
create index audit_actor_created_idx on public.audit_events (actor_employee_id, created_at desc);
create index audit_record_idx on public.audit_events (record_type, record_id, created_at desc);

create trigger tasks_set_updated_at before update on public.tasks for each row execute function app_private.set_updated_at();
create trigger pre_task_set_updated_at before update on public.pre_task_safety_records for each row execute function app_private.set_updated_at();
create trigger safety_records_set_updated_at before update on public.safety_records for each row execute function app_private.set_updated_at();
create trigger safety_fields_set_updated_at before update on public.safety_record_fields for each row execute function app_private.set_updated_at();
create trigger livestock_checks_set_updated_at before update on public.livestock_welfare_checks for each row execute function app_private.set_updated_at();
create trigger egg_collections_set_updated_at before update on public.egg_collections for each row execute function app_private.set_updated_at();
create trigger egg_colours_set_updated_at before update on public.egg_collection_colours for each row execute function app_private.set_updated_at();
create trigger concerns_set_updated_at before update on public.concerns for each row execute function app_private.set_updated_at();
create trigger attachments_set_updated_at before update on public.record_attachments for each row execute function app_private.set_updated_at();

create or replace function app_private.sync_egg_collection_total()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_id uuid := coalesce(new.egg_collection_id, old.egg_collection_id);
  previous_target_id uuid;
begin
  if tg_op = 'DELETE' then
    target_id := old.egg_collection_id;
  else
    target_id := new.egg_collection_id;
    if tg_op = 'UPDATE' then
      previous_target_id := old.egg_collection_id;
    end if;
  end if;

  update public.egg_collections
     set total_quantity = coalesce((select sum(quantity) from public.egg_collection_colours where egg_collection_id = target_id), 0)
   where id = target_id;
  if previous_target_id is distinct from target_id then
    update public.egg_collections
       set total_quantity = coalesce((select sum(quantity) from public.egg_collection_colours where egg_collection_id = previous_target_id), 0)
     where id = previous_target_id;
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;
revoke all on function app_private.sync_egg_collection_total() from public, anon, authenticated;

create trigger egg_collection_total_after_change
after insert or update or delete on public.egg_collection_colours
for each row execute function app_private.sync_egg_collection_total();

create or replace function app_private.sync_task_status_from_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.event_type in ('assigned', 'started', 'paused', 'resumed', 'completed', 'cancelled') then
    update public.tasks
       set status = case new.event_type when 'resumed' then 'started' else new.event_type end
     where id = new.task_id;
  end if;
  return new;
end;
$$;
revoke all on function app_private.sync_task_status_from_event() from public, anon, authenticated;

create trigger task_status_after_event
after insert on public.task_events
for each row execute function app_private.sync_task_status_from_event();
