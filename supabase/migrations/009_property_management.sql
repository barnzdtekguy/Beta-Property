-- Extend the existing property tables for the full admin listing workflow.
-- The properties, property_images tables and property-images bucket are
-- created by 007_real_estate_platform.sql and are intentionally reused here.

alter table public.properties
  add column if not exists country text not null default 'Nigeria',
  add column if not exists neighborhood text,
  add column if not exists negotiable boolean not null default false,
  add column if not exists toilets integer,
  add column if not exists parking_spaces integer,
  add column if not exists land_size numeric(12, 2),
  add column if not exists land_size_unit text,
  add column if not exists furnishing_status text,
  add column if not exists property_condition text,
  add column if not exists amenities text[] not null default '{}',
  add column if not exists availability_status text not null default 'available';

alter table public.properties
  drop constraint if exists properties_property_type_check,
  drop constraint if exists properties_availability_status_check,
  drop constraint if exists properties_toilets_check,
  drop constraint if exists properties_parking_spaces_check,
  drop constraint if exists properties_land_size_check,
  drop constraint if exists properties_furnishing_status_check,
  drop constraint if exists properties_property_condition_check;

alter table public.properties
  add constraint properties_property_type_check
    check (property_type in ('land', 'house', 'duplex', 'apartment', 'commercial', 'other')),
  add constraint properties_availability_status_check
    check (availability_status in ('available', 'sold', 'rented', 'leased')),
  add constraint properties_toilets_check
    check (toilets is null or toilets >= 0),
  add constraint properties_parking_spaces_check
    check (parking_spaces is null or parking_spaces >= 0),
  add constraint properties_land_size_check
    check (land_size is null or land_size >= 0),
  add constraint properties_furnishing_status_check
    check (furnishing_status is null or furnishing_status in ('unfurnished', 'partly_furnished', 'furnished')),
  add constraint properties_property_condition_check
    check (property_condition is null or property_condition in ('new', 'excellent', 'good', 'fair', 'needs_renovation', 'under_construction'));

create index if not exists idx_properties_admin_inventory
  on public.properties (status, availability_status, property_type, created_at desc);
create index if not exists idx_properties_location
  on public.properties (country, state, city, neighborhood);

-- Draft property photos must be visible to administrators in the manager.
-- Public read remains limited to images belonging to published properties.
drop policy if exists "Admins can read property images" on storage.objects;
create policy "Admins can read property images"
  on storage.objects for select to authenticated
  using (bucket_id = 'property-images' and public.is_admin());
