-- Allow an approved employee to register a verified asset only inside a
-- department to which they already have access. Management of an existing
-- asset remains restricted by the separate assets_manage policy.

drop policy assets_create on public.assets;

create policy assets_create on public.assets
for insert to authenticated
with check (
  created_by = (select auth.uid())
  and app_private.can_access_department(department_id, false)
);
