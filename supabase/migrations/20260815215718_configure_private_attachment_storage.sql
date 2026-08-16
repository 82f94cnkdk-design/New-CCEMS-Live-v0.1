-- CCEMS Stage 1: one private image bucket with parent-record-aware policies.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'field-record-attachments',
  'field-record-attachments',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

grant select, insert on storage.objects to authenticated;

create policy ccems_attachment_objects_read
on storage.objects for select to authenticated
using (
  bucket_id = 'field-record-attachments'
  and array_length(storage.foldername(name), 1) >= 2
  and case
    when (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    then app_private.can_access_parent_record((storage.foldername(name))[1], ((storage.foldername(name))[2])::uuid, false)
    else false
  end
);

create policy ccems_attachment_objects_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'field-record-attachments'
  and array_length(storage.foldername(name), 1) = 2
  and (storage.foldername(name))[1] in ('pre_task_safety', 'safety_record', 'livestock_welfare', 'egg_collection', 'concern')
  and case
    when (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    then app_private.can_access_parent_record((storage.foldername(name))[1], ((storage.foldername(name))[2])::uuid, true)
    else false
  end
);

-- No UPDATE or DELETE policy is intentionally provided. Evidence is amended by adding a new object.
