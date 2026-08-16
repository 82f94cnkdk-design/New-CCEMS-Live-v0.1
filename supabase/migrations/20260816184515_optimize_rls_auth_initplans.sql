-- Cache the authenticated user id once per statement inside RLS policies.
-- This preserves the existing access model while avoiding per-row evaluation.

drop policy employees_update_own on public.employees;
create policy employees_update_own on public.employees for update to authenticated
using (id = app_private.current_employee_id())
with check (id = app_private.current_employee_id() and auth_user_id = (select auth.uid()));

drop policy tasks_create on public.tasks;
create policy tasks_create on public.tasks for insert to authenticated
with check (app_private.can_access_department(department_id, true) and created_by = (select auth.uid()));

drop policy task_events_create on public.task_events;
create policy task_events_create on public.task_events for insert to authenticated
with check (created_by = (select auth.uid()) and exists (select 1 from public.tasks t where t.id = task_events.task_id and (t.assignee_id = app_private.current_employee_id() or app_private.can_access_department(t.department_id, true))));

drop policy pre_task_create on public.pre_task_safety_records;
create policy pre_task_create on public.pre_task_safety_records for insert to authenticated
with check (employee_id = app_private.current_employee_id() and created_by = (select auth.uid()) and app_private.can_access_department(department_id, false));

drop policy safety_create on public.safety_records;
create policy safety_create on public.safety_records for insert to authenticated
with check (submitter_id = app_private.current_employee_id() and created_by = (select auth.uid()) and app_private.can_access_department(department_id, false));

drop policy safety_fields_create on public.safety_record_fields;
create policy safety_fields_create on public.safety_record_fields for insert to authenticated
with check (created_by = (select auth.uid()) and exists (select 1 from public.safety_records r where r.id = safety_record_fields.safety_record_id and r.submitter_id = app_private.current_employee_id() and r.review_status = 'draft'));

drop policy safety_fields_update on public.safety_record_fields;
create policy safety_fields_update on public.safety_record_fields for update to authenticated
using (exists (select 1 from public.safety_records r where r.id = safety_record_fields.safety_record_id and r.submitter_id = app_private.current_employee_id() and r.review_status = 'draft'))
with check (created_by = (select auth.uid()) and exists (select 1 from public.safety_records r where r.id = safety_record_fields.safety_record_id and r.submitter_id = app_private.current_employee_id() and r.review_status = 'draft'));

drop policy livestock_create on public.livestock_welfare_checks;
create policy livestock_create on public.livestock_welfare_checks for insert to authenticated
with check (submitter_id = app_private.current_employee_id() and created_by = (select auth.uid()) and exists (select 1 from public.locations l where l.id = location_id and app_private.can_access_department(l.department_id, false)));

drop policy egg_create on public.egg_collections;
create policy egg_create on public.egg_collections for insert to authenticated
with check (submitter_id = app_private.current_employee_id() and created_by = (select auth.uid()) and exists (select 1 from public.locations l where l.id = location_id and app_private.can_access_department(l.department_id, false)));

drop policy egg_colours_create on public.egg_collection_colours;
create policy egg_colours_create on public.egg_collection_colours for insert to authenticated
with check (created_by = (select auth.uid()) and exists (select 1 from public.egg_collections e where e.id = egg_collection_id and e.submitter_id = app_private.current_employee_id()));

drop policy egg_colours_update on public.egg_collection_colours;
create policy egg_colours_update on public.egg_collection_colours for update to authenticated
using (exists (select 1 from public.egg_collections e where e.id = egg_collection_id and e.submitter_id = app_private.current_employee_id()))
with check (created_by = (select auth.uid()) and exists (select 1 from public.egg_collections e where e.id = egg_collection_id and e.submitter_id = app_private.current_employee_id()));

drop policy concerns_create on public.concerns;
create policy concerns_create on public.concerns for insert to authenticated
with check (reporter_id = app_private.current_employee_id() and created_by = (select auth.uid()) and app_private.can_access_department(responsible_department_id, false));

drop policy attachments_create on public.record_attachments;
create policy attachments_create on public.record_attachments for insert to authenticated
with check (uploaded_by = app_private.current_employee_id() and created_by = (select auth.uid()) and app_private.can_access_parent_record(record_type, record_id, true));
