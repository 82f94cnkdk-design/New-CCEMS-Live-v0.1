-- Submit pre-task and five-form safety records atomically with caller RLS enforced.

alter table public.pre_task_safety_records
add column client_reference text unique
check (client_reference is null or client_reference ~ '^PTS-[0-9]{7,20}$');

alter table public.safety_records
add column client_reference text unique
check (client_reference is null or client_reference ~ '^CC-[A-Z]+-[0-9]{4}-[0-9]{6,20}$');

create or replace function public.submit_pre_task_safety_record(
  p_client_reference text,
  p_department_code text,
  p_confirmations jsonb
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
  if p_client_reference !~ '^PTS-[0-9]{7,20}$' then
    raise exception 'Client reference is invalid';
  end if;
  if jsonb_typeof(p_confirmations) is distinct from 'object' then
    raise exception 'Confirmations must be supplied as an object';
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

  select id, reference, created_at into v_id, v_reference, v_created_at
  from public.pre_task_safety_records
  where client_reference = p_client_reference and employee_id = v_employee_id;
  if v_id is not null then
    return query select v_id, v_reference, v_created_at;
    return;
  end if;

  insert into public.pre_task_safety_records (
    client_reference, employee_id, department_id, record_date, confirmations,
    status, submitted_at, created_by
  ) values (
    p_client_reference, v_employee_id, v_department_id, current_date, p_confirmations,
    'submitted', now(), (select auth.uid())
  )
  returning id, reference, created_at into v_id, v_reference, v_created_at;

  return query select v_id, v_reference, v_created_at;
end;
$$;

revoke all on function public.submit_pre_task_safety_record(text, text, jsonb) from public, anon;
grant execute on function public.submit_pre_task_safety_record(text, text, jsonb) to authenticated;

create or replace function public.submit_safety_record(
  p_client_reference text,
  p_form_type text,
  p_department_code text,
  p_fields jsonb
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
    select 1
    from jsonb_object_keys(p_fields) as field_key(key)
    where field_key.key !~ '^field_[0-9]{1,2}$'
  ) then
    raise exception 'Safety field key is invalid';
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

  select id, reference, created_at into v_id, v_reference, v_created_at
  from public.safety_records
  where client_reference = p_client_reference and submitter_id = v_employee_id;
  if v_id is not null then
    return query select v_id, v_reference, v_created_at;
    return;
  end if;

  insert into public.safety_records (
    client_reference, form_type, department_id, submitter_id, review_status, created_by
  ) values (
    p_client_reference, p_form_type, v_department_id, v_employee_id, 'draft', (select auth.uid())
  )
  returning id, reference, created_at into v_id, v_reference, v_created_at;

  insert into public.safety_record_fields (safety_record_id, field_key, field_value, created_by)
  select v_id, field.key, field.value, (select auth.uid())
  from jsonb_each(p_fields) as field;

  update public.safety_records
  set review_status = 'submitted'
  where id = v_id;

  return query select v_id, v_reference, v_created_at;
end;
$$;

revoke all on function public.submit_safety_record(text, text, text, jsonb) from public, anon;
grant execute on function public.submit_safety_record(text, text, text, jsonb) to authenticated;
