-- DESTRUCTIVE: deletes all existing application data in the public schema.
-- It preserves Supabase Auth users, extensions, and other schemas. It also
-- removes only the application-owned property-images bucket and its objects.
-- Apply only to the project you intend to reset.

drop policy if exists "Published property images are publicly readable" on storage.objects;
drop policy if exists "Admins can upload property images" on storage.objects;
drop policy if exists "Admins can update property images" on storage.objects;
drop policy if exists "Admins can delete property images" on storage.objects;
delete from storage.objects where bucket_id = 'property-images';
delete from storage.buckets where id = 'property-images';

drop view if exists public.user_referral_stats cascade;

drop table if exists
  public.transaction_commissions,
  public.property_transactions,
  public.property_inspections,
  public.follow_up_activities,
  public.agent_property_assignments,
  public.property_images,
  public.properties,
  public.notifications,
  public.audit_logs,
  public.announcements,
  public.client_leads,
  public.commission_payments,
  public.referrals,
  public.referral_links,
  public.inquiries,
  public.login_attempts,
  public.users,
  public.admins
cascade;

drop function if exists public.current_active_realtor_id() cascade;
drop function if exists public.current_realtor_id() cascade;
drop function if exists public.increment_referral_link_clicks(uuid) cascade;
drop function if exists public.is_admin() cascade;
drop function if exists public.set_updated_at() cascade;
