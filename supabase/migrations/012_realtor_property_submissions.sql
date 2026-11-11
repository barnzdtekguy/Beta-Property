-- Realtor-submitted listings stay private until an administrator publishes them.
begin;

alter table public.properties
  add column if not exists submitted_by uuid references public.users(id) on delete set null;

create index if not exists idx_properties_submitter
  on public.properties (submitted_by, created_at desc);

drop policy if exists "Realtors can read own property submissions" on public.properties;
create policy "Realtors can read own property submissions"
  on public.properties for select to authenticated
  using (submitted_by = public.current_active_realtor_id());

drop policy if exists "Realtors can submit properties for review" on public.properties;
create policy "Realtors can submit properties for review"
  on public.properties for insert to authenticated
  with check (
    submitted_by = public.current_active_realtor_id()
    and status = 'pending_review'
    and published_at is null
    and created_by is null
    and availability_status = 'available'
  );

drop policy if exists "Realtors can update own pending submissions" on public.properties;
create policy "Realtors can update own pending submissions"
  on public.properties for update to authenticated
  using (
    submitted_by = public.current_active_realtor_id()
    and status = 'pending_review'
  )
  with check (
    submitted_by = public.current_active_realtor_id()
    and status = 'pending_review'
  );

-- The owner can edit listing details while the admin review is pending, but
-- cannot change ownership, publication, or availability fields through RLS.
create or replace function public.protect_realtor_property_submission()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not public.is_admin() and (
    new.submitted_by is distinct from old.submitted_by
    or new.created_by is distinct from old.created_by
    or new.status is distinct from old.status
    or new.published_at is distinct from old.published_at
    or new.availability_status is distinct from old.availability_status
  ) then
    raise exception 'Realtors cannot change property review or publication fields';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_realtor_property_submission on public.properties;
create trigger protect_realtor_property_submission
  before update on public.properties
  for each row execute function public.protect_realtor_property_submission();

drop policy if exists "Realtors can read own pending property images" on public.property_images;
create policy "Realtors can read own pending property images"
  on public.property_images for select to authenticated
  using (exists (
    select 1 from public.properties p
    where p.id = property_images.property_id
      and p.submitted_by = public.current_active_realtor_id()
  ));

drop policy if exists "Realtors can add images to own pending properties" on public.property_images;
create policy "Realtors can add images to own pending properties"
  on public.property_images for insert to authenticated
  with check (exists (
    select 1 from public.properties p
    where p.id = property_images.property_id
      and p.submitted_by = public.current_active_realtor_id()
      and p.status = 'pending_review'
  ));

drop policy if exists "Realtors can update images on own pending properties" on public.property_images;
create policy "Realtors can update images on own pending properties"
  on public.property_images for update to authenticated
  using (exists (
    select 1 from public.properties p
    where p.id = property_images.property_id
      and p.submitted_by = public.current_active_realtor_id()
      and p.status = 'pending_review'
  ))
  with check (exists (
    select 1 from public.properties p
    where p.id = property_images.property_id
      and p.submitted_by = public.current_active_realtor_id()
      and p.status = 'pending_review'
  ));

drop policy if exists "Realtors can delete images on own pending properties" on public.property_images;
create policy "Realtors can delete images on own pending properties"
  on public.property_images for delete to authenticated
  using (exists (
    select 1 from public.properties p
    where p.id = property_images.property_id
      and p.submitted_by = public.current_active_realtor_id()
      and p.status = 'pending_review'
  ));

drop policy if exists "Realtors can read own pending property image files" on storage.objects;
create policy "Realtors can read own pending property image files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'property-images'
    and exists (
      select 1 from public.properties p
      where p.id::text = (storage.foldername(name))[1]
        and p.submitted_by = public.current_active_realtor_id()
    )
  );

drop policy if exists "Realtors can upload own pending property image files" on storage.objects;
create policy "Realtors can upload own pending property image files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'property-images'
    and exists (
      select 1 from public.properties p
      where p.id::text = (storage.foldername(name))[1]
        and p.submitted_by = public.current_active_realtor_id()
        and p.status = 'pending_review'
    )
  );

drop policy if exists "Realtors can delete own pending property image files" on storage.objects;
create policy "Realtors can delete own pending property image files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'property-images'
    and exists (
      select 1 from public.properties p
      where p.id::text = (storage.foldername(name))[1]
        and p.submitted_by = public.current_active_realtor_id()
        and p.status = 'pending_review'
    )
  );

create or replace function public.notify_realtor_property_published()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from 'published'
    and new.status = 'published'
    and new.submitted_by is not null then
    insert into public.notifications (user_id, title, body, href)
    values (
      new.submitted_by,
      'Your property is approved and published',
      format('%s is now live on the Beta Property website.', new.title),
      format('/properties/%s', new.slug)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists notify_realtor_property_published on public.properties;
create trigger notify_realtor_property_published
  after update of status on public.properties
  for each row execute function public.notify_realtor_property_published();

commit;
