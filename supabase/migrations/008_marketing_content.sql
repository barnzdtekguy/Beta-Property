-- Public-facing developments and insight articles managed from the admin portal.
-- Apply after 007_real_estate_platform.sql.

create table if not exists public.developments (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text not null,
  content text not null,
  location text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_by uuid references public.admins(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'published' or published_at is not null)
);

create table if not exists public.insights (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text not null,
  content text not null,
  category text not null default 'Insights',
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_by uuid references public.admins(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'published' or published_at is not null)
);

create index if not exists idx_developments_public
  on public.developments (status, published_at desc);
create index if not exists idx_insights_public
  on public.insights (status, published_at desc);

drop trigger if exists developments_set_updated_at on public.developments;
create trigger developments_set_updated_at
  before update on public.developments
  for each row execute function public.set_updated_at();

drop trigger if exists insights_set_updated_at on public.insights;
create trigger insights_set_updated_at
  before update on public.insights
  for each row execute function public.set_updated_at();

alter table public.developments enable row level security;
alter table public.insights enable row level security;

drop policy if exists "Public can read published developments" on public.developments;
create policy "Public can read published developments"
  on public.developments for select to anon, authenticated
  using (status = 'published');
drop policy if exists "Admins can manage developments" on public.developments;
create policy "Admins can manage developments"
  on public.developments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Public can read published insights" on public.insights;
create policy "Public can read published insights"
  on public.insights for select to anon, authenticated
  using (status = 'published');
drop policy if exists "Admins can manage insights" on public.insights;
create policy "Admins can manage insights"
  on public.insights for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
