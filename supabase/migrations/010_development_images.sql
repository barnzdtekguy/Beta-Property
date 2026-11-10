-- Add private cover-image storage for developments.
alter table public.developments
  add column if not exists cover_image_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('development-images', 'development-images', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admins can read development images" on storage.objects;
create policy "Admins can read development images"
  on storage.objects for select to authenticated
  using (bucket_id = 'development-images' and public.is_admin());

drop policy if exists "Published development covers are publicly readable" on storage.objects;
create policy "Published development covers are publicly readable"
  on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'development-images'
    and exists (
      select 1 from public.developments d
      where d.cover_image_path = name and d.status = 'published'
    )
  );

drop policy if exists "Admins can upload development images" on storage.objects;
create policy "Admins can upload development images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'development-images'
    and public.is_admin()
    and (storage.foldername(name))[1] = 'developments'
  );

drop policy if exists "Admins can update development images" on storage.objects;
create policy "Admins can update development images"
  on storage.objects for update to authenticated
  using (bucket_id = 'development-images' and public.is_admin())
  with check (bucket_id = 'development-images' and public.is_admin());

drop policy if exists "Admins can delete development images" on storage.objects;
create policy "Admins can delete development images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'development-images' and public.is_admin());
