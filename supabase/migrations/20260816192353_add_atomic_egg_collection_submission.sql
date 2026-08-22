-- Submit an egg collection and its ten-colour breakdown as one transaction.
-- SECURITY INVOKER deliberately preserves table grants and RLS enforcement.

alter table public.egg_collections
add column client_reference text unique
check (client_reference is null or client_reference ~ '^HEG-[0-9]{10,20}$');

create or replace function public.submit_egg_collection(
  p_client_reference text,
  p_location_reference text,
  p_collection_name text,
  p_notes text,
  p_collection_started_at timestamptz,
  p_colours jsonb
)
returns table (
  egg_collection_id uuid,
  egg_collection_reference text,
  egg_collection_created_at timestamptz
)
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_location_id uuid;
  v_employee_id uuid;
  v_collection_id uuid;
  v_reference text;
  v_created_at timestamptz;
  v_total integer;
begin
  if p_client_reference !~ '^HEG-[0-9]{10,20}$' then
    raise exception 'Client reference is invalid';
  end if;

  if jsonb_typeof(p_colours) is distinct from 'object' then
    raise exception 'Egg colours must be supplied as an object';
  end if;

  if exists (
    select 1
      from jsonb_object_keys(p_colours) as colour(key)
     where colour.key not in (
       'White / Cream', 'Ivory', 'Pale Beige', 'Tan', 'Rich Brown',
       'Dark Chocolate', 'Blue', 'Blue Green', 'Olive Green', 'Speckled'
     )
  ) then
    raise exception 'Egg colours include an unsupported value';
  end if;

  select coalesce(sum(colour.quantity::integer), 0)
    into v_total
    from jsonb_each_text(p_colours) as colour(name, quantity);

  if v_total <= 0 then
    raise exception 'Egg collection quantity must be greater than zero';
  end if;

  if exists (
    select 1
      from jsonb_each_text(p_colours) as colour(name, quantity)
     where colour.quantity::integer < 0
  ) then
    raise exception 'Egg colour quantities cannot be negative';
  end if;

  select location.id
    into v_location_id
    from public.locations as location
   where location.reference = p_location_reference
     and location.active;

  if v_location_id is null then
    raise exception 'Approved heritage house was not found';
  end if;

  v_employee_id := app_private.current_employee_id();
  if v_employee_id is null then
    raise exception 'Authenticated user is not an active CCEMS employee';
  end if;

  select collection.id, collection.reference, collection.created_at
    into v_collection_id, v_reference, v_created_at
    from public.egg_collections as collection
   where collection.client_reference = p_client_reference
     and collection.submitter_id = v_employee_id;

  if v_collection_id is not null then
    return query select v_collection_id, v_reference, v_created_at;
    return;
  end if;

  insert into public.egg_collections (
    client_reference,
    location_id,
    collection_name,
    notes,
    collection_started_at,
    submitted_at,
    total_quantity,
    submitter_id,
    created_by
  ) values (
    p_client_reference,
    v_location_id,
    trim(p_collection_name),
    coalesce(p_notes, ''),
    p_collection_started_at,
    now(),
    v_total,
    v_employee_id,
    (select auth.uid())
  )
  returning id, reference, created_at
       into v_collection_id, v_reference, v_created_at;

  insert into public.egg_collection_colours (
    egg_collection_id,
    colour,
    quantity,
    created_by
  )
  select
    v_collection_id,
    colour.name,
    colour.quantity::integer,
    (select auth.uid())
  from jsonb_each_text(p_colours) as colour(name, quantity)
  where colour.quantity::integer > 0;

  return query select v_collection_id, v_reference, v_created_at;
end;
$$;

revoke all on function public.submit_egg_collection(text, text, text, text, timestamptz, jsonb) from public, anon;
grant execute on function public.submit_egg_collection(text, text, text, text, timestamptz, jsonb) to authenticated;
