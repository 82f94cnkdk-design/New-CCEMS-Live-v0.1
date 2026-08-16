-- CCEMS Stage 1: explicit Data API grants, role-aware RLS, and append-only auditing.

create or replace function app_private.current_employee_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.employees where auth_user_id = auth.uid() and employment_status = 'active';
$$;

create or replace function app_private.has_role(role_codes text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.employee_roles er
      join public.roles r on r.id = er.role_id
      join public.employees e on e.id = er.employee_id
     where e.auth_user_id = auth.uid()
       and e.employment_status = 'active'
       and r.code = any(role_codes)
  );
$$;

create or replace function app_private.can_access_department(target_department_id uuid, require_supervisor boolean default false)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app_private.has_role(array['estate_manager', 'admin'])
      or exists (
        select 1
          from public.employee_departments ed
          join public.employees e on e.id = ed.employee_id
         where e.auth_user_id = auth.uid()
           and e.employment_status = 'active'
           and ed.department_id = target_department_id
           and (not require_supervisor or ed.is_supervisor)
      );
$$;

revoke all on function app_private.current_employee_id() from public, anon;
revoke all on function app_private.has_role(text[]) from public, anon;
revoke all on function app_private.can_access_department(uuid, boolean) from public, anon;
grant usage on schema app_private to authenticated;
grant execute on function app_private.current_employee_id() to authenticated;
grant execute on function app_private.has_role(text[]) to authenticated;
grant execute on function app_private.can_access_department(uuid, boolean) to authenticated;
grant execute on function app_private.new_reference(text) to authenticated;

alter table public.employees enable row level security;
alter table public.departments enable row level security;
alter table public.locations enable row level security;
alter table public.livestock_groups enable row level security;
alter table public.livestock_group_locations enable row level security;
alter table public.roles enable row level security;
alter table public.employee_roles enable row level security;
alter table public.employee_departments enable row level security;
alter table public.devices enable row level security;
alter table public.tasks enable row level security;
alter table public.task_events enable row level security;
alter table public.pre_task_safety_records enable row level security;
alter table public.safety_records enable row level security;
alter table public.safety_record_fields enable row level security;
alter table public.livestock_welfare_checks enable row level security;
alter table public.egg_collections enable row level security;
alter table public.egg_collection_colours enable row level security;
alter table public.concerns enable row level security;
alter table public.record_attachments enable row level security;
alter table public.audit_events enable row level security;

revoke all on table public.employees, public.departments, public.locations, public.livestock_groups,
  public.livestock_group_locations, public.roles, public.employee_roles, public.employee_departments,
  public.devices, public.tasks, public.task_events, public.pre_task_safety_records,
  public.safety_records, public.safety_record_fields, public.livestock_welfare_checks,
  public.egg_collections, public.egg_collection_colours, public.concerns,
  public.record_attachments, public.audit_events from public, anon, authenticated;
revoke all on sequence public.ccems_human_reference_seq from public, anon, authenticated;

grant select on public.departments, public.locations, public.livestock_groups, public.livestock_group_locations, public.roles to authenticated;
grant select on public.employees, public.employee_roles, public.employee_departments, public.devices to authenticated;
grant update (preferred_name, contact_email, contact_phone) on public.employees to authenticated;
grant insert, update on public.devices to authenticated;
grant select, insert, update on public.tasks, public.pre_task_safety_records, public.safety_records,
  public.livestock_welfare_checks, public.egg_collections, public.concerns to authenticated;
grant select, insert on public.safety_record_fields, public.egg_collection_colours,
  public.record_attachments to authenticated;
grant update (field_value) on public.safety_record_fields to authenticated;
grant update (quantity) on public.egg_collection_colours to authenticated;
grant select, insert on public.task_events to authenticated;
grant select on public.audit_events to authenticated;

create policy employees_select on public.employees for select to authenticated
using (
  id = app_private.current_employee_id()
  or app_private.has_role(array['estate_manager', 'admin'])
  or exists (
    select 1 from public.employee_departments viewer
    join public.employee_departments subject on subject.department_id = viewer.department_id
    where viewer.employee_id = app_private.current_employee_id()
      and viewer.is_supervisor and subject.employee_id = employees.id
  )
);
create policy employees_update_own on public.employees for update to authenticated
using (id = app_private.current_employee_id())
with check (id = app_private.current_employee_id() and auth_user_id = auth.uid());

create policy reference_departments_read on public.departments for select to authenticated using (active or app_private.has_role(array['estate_manager', 'admin']));
create policy reference_locations_read on public.locations for select to authenticated using (active or app_private.has_role(array['estate_manager', 'admin']));
create policy reference_livestock_read on public.livestock_groups for select to authenticated using (active or app_private.has_role(array['estate_manager', 'admin']));
create policy reference_livestock_locations_read on public.livestock_group_locations for select to authenticated using (true);
create policy roles_read on public.roles for select to authenticated using (true);

create policy employee_roles_read on public.employee_roles for select to authenticated
using (employee_id = app_private.current_employee_id() or app_private.has_role(array['estate_manager', 'admin']));
create policy employee_departments_read on public.employee_departments for select to authenticated
using (
  employee_id = app_private.current_employee_id()
  or app_private.has_role(array['estate_manager', 'admin'])
  or app_private.can_access_department(department_id, true)
);

create policy devices_read on public.devices for select to authenticated
using (
  assigned_employee_id = app_private.current_employee_id()
  or app_private.has_role(array['estate_manager', 'admin'])
  or exists (
    select 1 from public.employee_departments subject
    where subject.employee_id = devices.assigned_employee_id
      and app_private.can_access_department(subject.department_id, true)
  )
);
create policy devices_request on public.devices for insert to authenticated
with check (assigned_employee_id = app_private.current_employee_id() and approval_status = 'pending' and approved_by is null);
create policy devices_manage on public.devices for update to authenticated
using (app_private.has_role(array['estate_manager', 'admin']))
with check (app_private.has_role(array['estate_manager', 'admin']));

create policy tasks_read on public.tasks for select to authenticated
using (assignee_id = app_private.current_employee_id() or app_private.can_access_department(department_id, true));
create policy tasks_create on public.tasks for insert to authenticated
with check (app_private.can_access_department(department_id, true) and created_by = auth.uid());
create policy tasks_manage on public.tasks for update to authenticated
using (app_private.can_access_department(department_id, true))
with check (app_private.can_access_department(department_id, true));

create policy task_events_read on public.task_events for select to authenticated
using (exists (select 1 from public.tasks t where t.id = task_events.task_id and (t.assignee_id = app_private.current_employee_id() or app_private.can_access_department(t.department_id, true))));
create policy task_events_create on public.task_events for insert to authenticated
with check (created_by = auth.uid() and exists (select 1 from public.tasks t where t.id = task_events.task_id and (t.assignee_id = app_private.current_employee_id() or app_private.can_access_department(t.department_id, true))));

create policy pre_task_read on public.pre_task_safety_records for select to authenticated
using (employee_id = app_private.current_employee_id() or app_private.can_access_department(department_id, true));
create policy pre_task_create on public.pre_task_safety_records for insert to authenticated
with check (employee_id = app_private.current_employee_id() and created_by = auth.uid() and app_private.can_access_department(department_id, false));
create policy pre_task_update_draft on public.pre_task_safety_records for update to authenticated
using ((employee_id = app_private.current_employee_id() and status = 'draft') or app_private.can_access_department(department_id, true))
with check ((employee_id = app_private.current_employee_id() and status in ('draft', 'submitted')) or app_private.can_access_department(department_id, true));

create policy safety_read on public.safety_records for select to authenticated
using (submitter_id = app_private.current_employee_id() or app_private.can_access_department(department_id, true));
create policy safety_create on public.safety_records for insert to authenticated
with check (submitter_id = app_private.current_employee_id() and created_by = auth.uid() and app_private.can_access_department(department_id, false));
create policy safety_update on public.safety_records for update to authenticated
using ((submitter_id = app_private.current_employee_id() and review_status = 'draft') or app_private.can_access_department(department_id, true))
with check ((submitter_id = app_private.current_employee_id() and review_status in ('draft', 'submitted')) or app_private.can_access_department(department_id, true));
create policy safety_fields_read on public.safety_record_fields for select to authenticated
using (exists (select 1 from public.safety_records r where r.id = safety_record_fields.safety_record_id and (r.submitter_id = app_private.current_employee_id() or app_private.can_access_department(r.department_id, true))));
create policy safety_fields_create on public.safety_record_fields for insert to authenticated
with check (created_by = auth.uid() and exists (select 1 from public.safety_records r where r.id = safety_record_fields.safety_record_id and r.submitter_id = app_private.current_employee_id() and r.review_status = 'draft'));
create policy safety_fields_update on public.safety_record_fields for update to authenticated
using (exists (select 1 from public.safety_records r where r.id = safety_record_fields.safety_record_id and r.submitter_id = app_private.current_employee_id() and r.review_status = 'draft'))
with check (created_by = auth.uid() and exists (select 1 from public.safety_records r where r.id = safety_record_fields.safety_record_id and r.submitter_id = app_private.current_employee_id() and r.review_status = 'draft'));

create policy livestock_read on public.livestock_welfare_checks for select to authenticated
using (submitter_id = app_private.current_employee_id() or exists (select 1 from public.locations l where l.id = location_id and app_private.can_access_department(l.department_id, true)));
create policy livestock_create on public.livestock_welfare_checks for insert to authenticated
with check (submitter_id = app_private.current_employee_id() and created_by = auth.uid() and exists (select 1 from public.locations l where l.id = location_id and app_private.can_access_department(l.department_id, false)));
create policy livestock_review on public.livestock_welfare_checks for update to authenticated
using (exists (select 1 from public.locations l where l.id = location_id and app_private.can_access_department(l.department_id, true)))
with check (exists (select 1 from public.locations l where l.id = location_id and app_private.can_access_department(l.department_id, true)));

create policy egg_read on public.egg_collections for select to authenticated
using (submitter_id = app_private.current_employee_id() or exists (select 1 from public.locations l where l.id = location_id and app_private.can_access_department(l.department_id, true)));
create policy egg_create on public.egg_collections for insert to authenticated
with check (submitter_id = app_private.current_employee_id() and created_by = auth.uid() and exists (select 1 from public.locations l where l.id = location_id and app_private.can_access_department(l.department_id, false)));
create policy egg_colours_read on public.egg_collection_colours for select to authenticated
using (exists (select 1 from public.egg_collections e where e.id = egg_collection_id and (e.submitter_id = app_private.current_employee_id() or exists (select 1 from public.locations l where l.id = e.location_id and app_private.can_access_department(l.department_id, true)))));
create policy egg_colours_create on public.egg_collection_colours for insert to authenticated
with check (created_by = auth.uid() and exists (select 1 from public.egg_collections e where e.id = egg_collection_id and e.submitter_id = app_private.current_employee_id()));
create policy egg_colours_update on public.egg_collection_colours for update to authenticated
using (exists (select 1 from public.egg_collections e where e.id = egg_collection_id and e.submitter_id = app_private.current_employee_id()))
with check (created_by = auth.uid() and exists (select 1 from public.egg_collections e where e.id = egg_collection_id and e.submitter_id = app_private.current_employee_id()));

create policy concerns_read on public.concerns for select to authenticated
using (reporter_id = app_private.current_employee_id() or app_private.can_access_department(responsible_department_id, true));
create policy concerns_create on public.concerns for insert to authenticated
with check (reporter_id = app_private.current_employee_id() and created_by = auth.uid() and app_private.can_access_department(responsible_department_id, false));
create policy concerns_review on public.concerns for update to authenticated
using (app_private.can_access_department(responsible_department_id, true))
with check (app_private.can_access_department(responsible_department_id, true));

create or replace function app_private.can_access_parent_record(target_type text, target_id uuid, for_write boolean default false)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return case target_type
    when 'pre_task_safety' then exists (select 1 from public.pre_task_safety_records r where r.id = target_id and (case when for_write then r.employee_id = app_private.current_employee_id() and r.created_by = auth.uid() and r.created_at >= now() - interval '15 minutes' else r.employee_id = app_private.current_employee_id() or app_private.can_access_department(r.department_id, true) end))
    when 'safety_record' then exists (select 1 from public.safety_records r where r.id = target_id and (case when for_write then r.submitter_id = app_private.current_employee_id() and r.created_by = auth.uid() and r.created_at >= now() - interval '15 minutes' else r.submitter_id = app_private.current_employee_id() or app_private.can_access_department(r.department_id, true) end))
    when 'livestock_welfare' then exists (select 1 from public.livestock_welfare_checks r join public.locations l on l.id = r.location_id where r.id = target_id and (case when for_write then r.submitter_id = app_private.current_employee_id() and r.created_by = auth.uid() and r.created_at >= now() - interval '15 minutes' else r.submitter_id = app_private.current_employee_id() or app_private.can_access_department(l.department_id, true) end))
    when 'egg_collection' then exists (select 1 from public.egg_collections r join public.locations l on l.id = r.location_id where r.id = target_id and (case when for_write then r.submitter_id = app_private.current_employee_id() and r.created_by = auth.uid() and r.created_at >= now() - interval '15 minutes' else r.submitter_id = app_private.current_employee_id() or app_private.can_access_department(l.department_id, true) end))
    when 'concern' then exists (select 1 from public.concerns r where r.id = target_id and (case when for_write then r.reporter_id = app_private.current_employee_id() and r.created_by = auth.uid() and r.created_at >= now() - interval '15 minutes' else r.reporter_id = app_private.current_employee_id() or app_private.can_access_department(r.responsible_department_id, true) end))
    else false
  end;
end;
$$;
revoke all on function app_private.can_access_parent_record(text, uuid, boolean) from public, anon;
grant execute on function app_private.can_access_parent_record(text, uuid, boolean) to authenticated;

create policy attachments_read on public.record_attachments for select to authenticated
using (app_private.can_access_parent_record(record_type, record_id, false));
create policy attachments_create on public.record_attachments for insert to authenticated
with check (uploaded_by = app_private.current_employee_id() and created_by = auth.uid() and app_private.can_access_parent_record(record_type, record_id, true));
create policy audit_read on public.audit_events for select to authenticated
using (
  actor_employee_id = app_private.current_employee_id()
  or app_private.has_role(array['estate_manager', 'admin'])
  or exists (
    select 1 from public.employee_departments subject
    where subject.employee_id = audit_events.actor_employee_id
      and app_private.can_access_department(subject.department_id, true)
  )
);

create or replace function app_private.write_audit_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_events (actor_employee_id, action, record_type, record_id, created_by, metadata)
  values (
    app_private.current_employee_id(),
    upper(tg_op) || '_' || upper(tg_table_name),
    tg_table_name,
    new.id,
    auth.uid(),
    jsonb_build_object('operation', tg_op)
  );
  return new;
end;
$$;
revoke all on function app_private.write_audit_event() from public, anon, authenticated;

create trigger audit_tasks after insert or update on public.tasks for each row execute function app_private.write_audit_event();
create trigger audit_task_events after insert on public.task_events for each row execute function app_private.write_audit_event();
create trigger audit_pre_task after insert or update on public.pre_task_safety_records for each row execute function app_private.write_audit_event();
create trigger audit_safety after insert or update on public.safety_records for each row execute function app_private.write_audit_event();
create trigger audit_livestock after insert or update on public.livestock_welfare_checks for each row execute function app_private.write_audit_event();
create trigger audit_eggs after insert or update on public.egg_collections for each row execute function app_private.write_audit_event();
create trigger audit_concerns after insert or update on public.concerns for each row execute function app_private.write_audit_event();
create trigger audit_attachments after insert or update on public.record_attachments for each row execute function app_private.write_audit_event();
