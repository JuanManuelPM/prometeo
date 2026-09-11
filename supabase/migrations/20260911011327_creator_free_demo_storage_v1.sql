-- Browser-rendered $0 demo: allow authenticated owner to write only inside their own creator-assets prefix.
drop policy if exists creator_free_demo_owner_insert_v1 on storage.objects;
create policy creator_free_demo_owner_insert_v1 on storage.objects
for insert to authenticated
with check (bucket_id='creator-assets' and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists creator_free_demo_owner_update_v1 on storage.objects;
create policy creator_free_demo_owner_update_v1 on storage.objects
for update to authenticated
using (bucket_id='creator-assets' and (storage.foldername(name))[1]=auth.uid()::text)
with check (bucket_id='creator-assets' and (storage.foldername(name))[1]=auth.uid()::text);
