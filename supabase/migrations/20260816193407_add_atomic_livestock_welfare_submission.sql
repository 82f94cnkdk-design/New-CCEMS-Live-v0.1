-- Submit one complete livestock welfare check with RLS enforced for the caller.

alter table public.livestock_welfare_checks
add column client_reference text unique
check (client_reference is null or client_reference ~ '^LWC-[0-9]{7,20}$'),
add column animals_observed integer
check (animals_observed is null or animals_observed > 0),
add column confirmations jsonb
check (confirmations is null or jsonb_typeof(confirmations) = 'object');

create or replace function public.submit_livestock_welfare_check(
  p_client_reference text,
  p_livestock_group_reference text,
  p_location_reference text,
  p_welfare_status text,
  p_observations text,
  p_animals_observed integer,
  p_follow_up_date date,
  p_confirmations jsonb
)
returns table (
  welfare_check_id uuid,
  welfare_check_reference text,
  welfare_check_created_at timestamptz
)
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_group_id uuid;
  v_location_id uuid;
  v_employee_id uuid;
  v_check_id uuid;
  v_reference text;
  v_created_at timestamptz;
begin
  if p_client_reference !~ '^LWC-[0-9]{7,20}$' then
    raise exception 'Client reference is invalid';
  end if;

  if p_welfare_status not in ('good', 'monitor', 'concern', 'urgent') then
    raise exception 'Welfare status is invalid';
  end if;

  if p_animals_observed is null or p_animals_observed <= 0 then
    raise exception 'Animals observed must be greater than zero';
  end if;

  if jsonb_typeof(p_confirmations) is distinct from 'object' then
    raise exception 'Welfare confirmations must be supplied as an object';
  end if;

  if coalesce((p_confirmations ->> 'completed')::integer, 0) < 1 then
    raise exception 'Welfare confirmations are incomplete';
  end if;

  select group_record.id, location.id
    into v_group_id, v_location_id
    from public.livestock_groups as group_record
    join public.livestock_group_locations as approved
      on approved.livestock_group_id = group_record.id
    join public.locations as location
      on location.id = approved.location_id
   where group_record.reference = p_livestock_group_reference
     and location.reference = p_location_reference
     and group_record.active
     and location.active;

  if v_group_id is null or v_location_id is null then
    raise exception 'Livestock group and location are not an approved pairing';
  end if;

  v_employee_id := app_private.current_employee_id();
  if v_employee_id is null then
    raise exception 'Authenticated user is not an active CCEMS employee';
  end if;

  select welfare.id, welfare.reference, welfare.created_at
    into v_check_id, v_reference, v_created_at
    from public.livestock_welfare_checks as welfare
   where welfare.client_reference = p_client_reference
     and welfare.submitter_id = v_employee_id;

  if v_check_id is not null then
    return query select v_check_id, v_reference, v_created_at;
    return;
  end if;

  insert into public.livestock_welfare_checks (
    client_reference,
    livestock_group_id,
    location_id,
    welfare_status,
    observations,
    animals_observed,
    confirmations,
    check_date,
    follow_up_date,
    declaration_confirmed,
    submitter_id,
    review_status,
    created_by
  ) values (
    p_client_reference,
    v_group_id,
    v_location_id,
    p_welfare_status,
    coalesce(p_observations, ''),
    p_animals_observed,
    p_confirmations,
    current_date,
    p_follow_up_date,
    true,
    v_employee_id,
    'submitted',
    (select auth.uid())
  )
  returning id, reference, created_at
       into v_check_id, v_reference, v_created_at;

  return query select v_check_id, v_reference, v_created_at;
end;
$$;

revoke all on function public.submit_livestock_welfare_check(text, text, text, text, text, integer, date, jsonb) from public, anon;
grant execute on function public.submit_livestock_welfare_check(text, text, text, text, text, integer, date, jsonb) to authenticated;
