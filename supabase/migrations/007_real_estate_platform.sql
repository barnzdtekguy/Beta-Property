-- Unified real-estate operations, agent approval, property catalog and CRM.
-- Apply after schema.sql and migrations 005 and 006 on a fresh install.

alter table public.users
  alter column status set default 'pending';

alter table public.users
  drop constraint if exists users_status_check;

alter table public.users
  add constraint users_status_check
  check (status in ('pending', 'active', 'inactive', 'rejected', 'suspended'));

alter table public.users
  add column if not exists email_verified_at timestamptz;

alter table public.users
  drop constraint if exists users_active_requires_verified_email;

alter table public.users
  add constraint users_active_requires_verified_email
  check (status <> 'active' or email_verified_at is not null);

create or replace function public.current_realtor_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.users
  where auth_id = auth.uid()
    and status = 'active'
    and email_verified_at is not null
  limit 1;
$$;

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null,
  property_type text not null check (property_type in ('land', 'house', 'apartment', 'commercial', 'other')),
  listing_type text not null check (listing_type in ('sale', 'rent', 'lease')),
  status text not null default 'draft' check (status in ('draft', 'pending_review', 'published', 'archived')),
  price numeric(14, 2) check (price is null or price >= 0),
  currency text not null default 'NGN' check (currency ~ '^[A-Z]{3}$'),
  address text,
  city text not null,
  state text,
  bedrooms integer check (bedrooms is null or bedrooms >= 0),
  bathrooms integer check (bathrooms is null or bathrooms >= 0),
  area numeric(12, 2) check (area is null or area >= 0),
  area_unit text,
  features text[] not null default '{}',
  created_by uuid references public.admins(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_properties_public
  on public.properties (status, property_type, listing_type, city);
create index if not exists idx_properties_created_at
  on public.properties (created_at desc);

alter table public.properties
  drop constraint if exists properties_published_at_check;
alter table public.properties
  add constraint properties_published_at_check
  check (status <> 'published' or published_at is not null);

create table if not exists public.property_images (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  storage_path text not null unique,
  alt_text text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_property_images_property
  on public.property_images (property_id, sort_order);

create table if not exists public.agent_property_assignments (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  agent_id uuid not null references public.users(id) on delete cascade,
  assigned_by uuid references public.admins(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (property_id, agent_id)
);

create index if not exists idx_property_assignments_agent
  on public.agent_property_assignments (agent_id, created_at desc);

alter table public.inquiries
  add column if not exists property_id uuid references public.properties(id) on delete set null,
  add column if not exists assigned_to uuid references public.users(id) on delete set null,
  add column if not exists preferred_contact_method text
    check (preferred_contact_method is null or preferred_contact_method in ('phone', 'email', 'whatsapp'));

create index if not exists idx_inquiries_property on public.inquiries (property_id);
create index if not exists idx_inquiries_assigned on public.inquiries (assigned_to, created_at desc);

alter table public.client_leads
  add column if not exists property_id uuid references public.properties(id) on delete set null;

create table if not exists public.follow_up_activities (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid references public.inquiries(id) on delete cascade,
  client_lead_id uuid references public.client_leads(id) on delete cascade,
  agent_id uuid not null references public.users(id) on delete cascade,
  activity_type text not null check (activity_type in ('note', 'call', 'email', 'meeting', 'inspection')),
  details text not null,
  follow_up_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  check (num_nonnulls(inquiry_id, client_lead_id) = 1)
);

create index if not exists idx_follow_up_agent
  on public.follow_up_activities (agent_id, follow_up_at);

create table if not exists public.property_inspections (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  inquiry_id uuid references public.inquiries(id) on delete set null,
  client_lead_id uuid references public.client_leads(id) on delete set null,
  agent_id uuid not null references public.users(id) on delete cascade,
  scheduled_at timestamptz not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'cancelled', 'no_show')),
  notes text,
  created_at timestamptz not null default now(),
  check (num_nonnulls(inquiry_id, client_lead_id) <= 1)
);

create index if not exists idx_inspections_agent
  on public.property_inspections (agent_id, scheduled_at);

create table if not exists public.property_transactions (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete restrict,
  inquiry_id uuid references public.inquiries(id) on delete set null,
  client_lead_id uuid references public.client_leads(id) on delete set null,
  agent_id uuid not null references public.users(id) on delete restrict,
  transaction_type text not null check (transaction_type in ('sale', 'rental', 'lease')),
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'cancelled')),
  amount numeric(14, 2) not null check (amount >= 0),
  completed_at timestamptz,
  notes text,
  created_by uuid references public.admins(id) on delete set null,
  created_at timestamptz not null default now(),
  check (num_nonnulls(inquiry_id, client_lead_id) <= 1)
);

create index if not exists idx_transactions_agent
  on public.property_transactions (agent_id, created_at desc);

create table if not exists public.transaction_commissions (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.property_transactions(id) on delete cascade,
  agent_id uuid not null references public.users(id) on delete restrict,
  amount numeric(14, 2) not null check (amount >= 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'paid', 'void')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (transaction_id, agent_id)
);

create index if not exists idx_transaction_commissions_agent
  on public.transaction_commissions (agent_id, status);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  body text not null,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user
  on public.notifications (user_id, created_at desc);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_created
  on public.audit_logs (created_at desc);

create or replace function public.current_active_realtor_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.users
  where auth_id = auth.uid()
    and status = 'active'
    and email_verified_at is not null
  limit 1;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.increment_referral_link_clicks(referral_link_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.referral_links
  set clicks = clicks + 1
  where id = referral_link_id;
$$;

revoke all on function public.increment_referral_link_clicks(uuid) from public, anon, authenticated;
grant execute on function public.increment_referral_link_clicks(uuid) to service_role;

drop trigger if exists properties_set_updated_at on public.properties;
create trigger properties_set_updated_at
  before update on public.properties
  for each row execute function public.set_updated_at();

alter table public.properties enable row level security;
alter table public.property_images enable row level security;
alter table public.agent_property_assignments enable row level security;
alter table public.follow_up_activities enable row level security;
alter table public.property_inspections enable row level security;
alter table public.property_transactions enable row level security;
alter table public.transaction_commissions enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "Public can read published properties" on public.properties;
create policy "Public can read published properties"
  on public.properties for select to anon, authenticated
  using (status = 'published');
drop policy if exists "Admins can manage properties" on public.properties;
create policy "Admins can manage properties"
  on public.properties for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Assigned agents can read properties" on public.properties;
create policy "Assigned agents can read properties"
  on public.properties for select to authenticated
  using (exists (
    select 1 from public.agent_property_assignments a
    where a.property_id = properties.id
      and a.agent_id = public.current_active_realtor_id()
  ));

drop policy if exists "Public can read images of published properties" on public.property_images;
create policy "Public can read images of published properties"
  on public.property_images for select to anon, authenticated
  using (exists (
    select 1 from public.properties p
    where p.id = property_images.property_id and p.status = 'published'
  ));
drop policy if exists "Admins can manage property images" on public.property_images;
create policy "Admins can manage property images"
  on public.property_images for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Assigned agents can read property images" on public.property_images;
create policy "Assigned agents can read property images"
  on public.property_images for select to authenticated
  using (exists (
    select 1 from public.agent_property_assignments a
    where a.property_id = property_images.property_id
      and a.agent_id = public.current_active_realtor_id()
  ));

drop policy if exists "Admins can manage property assignments" on public.agent_property_assignments;
create policy "Admins can manage property assignments"
  on public.agent_property_assignments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Agents can read their property assignments" on public.agent_property_assignments;
create policy "Agents can read their property assignments"
  on public.agent_property_assignments for select to authenticated
  using (agent_id = public.current_active_realtor_id());

drop policy if exists "Admins can manage inquiries" on public.inquiries;
create policy "Admins can manage inquiries"
  on public.inquiries for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Assigned agents can read inquiries" on public.inquiries;
create policy "Assigned agents can read inquiries"
  on public.inquiries for select to authenticated
  using (assigned_to = public.current_active_realtor_id());
drop policy if exists "Assigned agents can update inquiries" on public.inquiries;
create policy "Assigned agents can update inquiries"
  on public.inquiries for update to authenticated
  using (assigned_to = public.current_active_realtor_id())
  with check (assigned_to = public.current_active_realtor_id());
revoke update on public.inquiries from authenticated;
grant update (status, assigned_to) on public.inquiries to authenticated;

drop policy if exists "Admins can manage client leads" on public.client_leads;
create policy "Admins can manage client leads"
  on public.client_leads for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins can manage follow-up activities" on public.follow_up_activities;
create policy "Admins can manage follow-up activities"
  on public.follow_up_activities for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Agents can read their follow-up activities" on public.follow_up_activities;
create policy "Agents can read their follow-up activities"
  on public.follow_up_activities for select to authenticated
  using (agent_id = public.current_active_realtor_id());
drop policy if exists "Agents can create their follow-up activities" on public.follow_up_activities;
create policy "Agents can create their follow-up activities"
  on public.follow_up_activities for insert to authenticated
  with check (
    agent_id = public.current_active_realtor_id()
    and (
      exists (select 1 from public.inquiries i where i.id = inquiry_id and i.assigned_to = agent_id)
      or exists (select 1 from public.client_leads l where l.id = client_lead_id and l.realtor_id = agent_id)
    )
  );
drop policy if exists "Agents can update their follow-up activities" on public.follow_up_activities;
create policy "Agents can update their follow-up activities"
  on public.follow_up_activities for update to authenticated
  using (agent_id = public.current_active_realtor_id())
  with check (
    agent_id = public.current_active_realtor_id()
    and (
      exists (select 1 from public.inquiries i where i.id = inquiry_id and i.assigned_to = agent_id)
      or exists (select 1 from public.client_leads l where l.id = client_lead_id and l.realtor_id = agent_id)
    )
  );

drop policy if exists "Admins can manage inspections" on public.property_inspections;
create policy "Admins can manage inspections"
  on public.property_inspections for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Agents can manage their inspections" on public.property_inspections;
create policy "Agents can manage their inspections"
  on public.property_inspections for all to authenticated
  using (agent_id = public.current_active_realtor_id())
  with check (
    agent_id = public.current_active_realtor_id()
    and exists (
      select 1 from public.agent_property_assignments a
      where a.property_id = property_inspections.property_id and a.agent_id = agent_id
    )
    and (
      inquiry_id is null
      or exists (select 1 from public.inquiries i where i.id = inquiry_id and i.assigned_to = agent_id)
    )
    and (
      client_lead_id is null
      or exists (select 1 from public.client_leads l where l.id = client_lead_id and l.realtor_id = agent_id)
    )
  );

drop policy if exists "Admins can manage property transactions" on public.property_transactions;
create policy "Admins can manage property transactions"
  on public.property_transactions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Agents can read their property transactions" on public.property_transactions;
create policy "Agents can read their property transactions"
  on public.property_transactions for select to authenticated
  using (agent_id = public.current_active_realtor_id());

drop policy if exists "Admins can manage transaction commissions" on public.transaction_commissions;
create policy "Admins can manage transaction commissions"
  on public.transaction_commissions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Agents can read their transaction commissions" on public.transaction_commissions;
create policy "Agents can read their transaction commissions"
  on public.transaction_commissions for select to authenticated
  using (agent_id = public.current_active_realtor_id());

drop policy if exists "Users can read their notifications" on public.notifications;
create policy "Users can read their notifications"
  on public.notifications for select to authenticated
  using (user_id = public.current_active_realtor_id());
drop policy if exists "Users can update their notifications" on public.notifications;
create policy "Users can update their notifications"
  on public.notifications for update to authenticated
  using (user_id = public.current_active_realtor_id())
  with check (user_id = public.current_active_realtor_id());
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;
drop policy if exists "Admins can manage notifications" on public.notifications;
create policy "Admins can manage notifications"
  on public.notifications for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins can read audit logs" on public.audit_logs;
create policy "Admins can read audit logs"
  on public.audit_logs for select to authenticated
  using (public.is_admin());
drop policy if exists "Admins can insert audit logs" on public.audit_logs;
create policy "Admins can insert audit logs"
  on public.audit_logs for insert to authenticated
  with check (public.is_admin());

drop policy if exists "Any signed-in user can read announcements" on public.announcements;
create policy "Approved agents and admins can read announcements"
  on public.announcements for select to authenticated
  using (public.is_admin() or public.current_active_realtor_id() is not null);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('property-images', 'property-images', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Published property images are publicly readable" on storage.objects;
create policy "Published property images are publicly readable"
  on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'property-images'
    and exists (
      select 1 from public.properties p
      where p.id::text = (storage.foldername(name))[1]
        and p.status = 'published'
    )
  );
drop policy if exists "Admins can upload property images" on storage.objects;
create policy "Admins can upload property images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'property-images'
    and public.is_admin()
    and exists (
      select 1 from public.properties p
      where p.id::text = (storage.foldername(name))[1]
    )
  );
drop policy if exists "Admins can update property images" on storage.objects;
create policy "Admins can update property images"
  on storage.objects for update to authenticated
  using (bucket_id = 'property-images' and public.is_admin())
  with check (bucket_id = 'property-images' and public.is_admin());
drop policy if exists "Admins can delete property images" on storage.objects;
create policy "Admins can delete property images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'property-images' and public.is_admin());
