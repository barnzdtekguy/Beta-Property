-- ============================================================================
-- Security hardening: enforce lead and payout ownership in RLS, and remove
-- the legacy referral-based inquiry access rule. Apply after migration 010.
-- ============================================================================

begin;

-- Stop suspended, inactive, or unverified accounts from using the public
-- Supabase API to retrieve their old client and compensation records.
drop policy if exists "Realtors can read own leads" on public.client_leads;
drop policy if exists "Active realtors can read own leads" on public.client_leads;
create policy "Active realtors can read own leads"
  on public.client_leads for select to authenticated
  using (realtor_id = public.current_active_realtor_id());

drop policy if exists "Realtors can read their own commission payments" on public.commission_payments;
drop policy if exists "Active realtors can read their own commission payments" on public.commission_payments;
create policy "Active realtors can read their own commission payments"
  on public.commission_payments for select to authenticated
  using (user_id = public.current_active_realtor_id());

drop policy if exists "Realtors can read their own referrals" on public.referrals;
drop policy if exists "Active realtors can read their own referrals" on public.referrals;
create policy "Active realtors can read their own referrals"
  on public.referrals for select to authenticated
  using (referrer_id = public.current_active_realtor_id());

drop policy if exists "Realtors can read their own referral links" on public.referral_links;
drop policy if exists "Active realtors can read their own referral links" on public.referral_links;
create policy "Active realtors can read their own referral links"
  on public.referral_links for select to authenticated
  using (owner_id = public.current_active_realtor_id());

-- Realtors may submit a lead only for themselves and cannot mark it successful,
-- set commission details, or add admin-only decision data through the API.
drop policy if exists "Realtors can submit own leads" on public.client_leads;
drop policy if exists "Active realtors can submit pending own leads" on public.client_leads;
create policy "Active realtors can submit pending own leads"
  on public.client_leads for insert to authenticated
  with check (
    realtor_id = public.current_active_realtor_id()
    and status = 'pending'
    and commission_amount is null
    and admin_notes is null
    and decided_at is null
  );

-- A realtor may request payment only for their own approved sale. The amount
-- must be the commission already approved by an admin; the API cannot create
-- paid/failed rows or insert payment-processing metadata.
drop policy if exists "Realtors can apply for their own payouts" on public.commission_payments;
drop policy if exists "Realtors can apply for eligible own payouts" on public.commission_payments;
create policy "Realtors can apply for eligible own payouts"
  on public.commission_payments for insert to authenticated
  with check (
    user_id = public.current_active_realtor_id()
    and lead_id is not null
    and status = 'pending'
    and paid_at is null
    and amount > 0
    and method is null
    and reference is null
    and bank_name is not null
    and length(btrim(bank_name)) between 1 and 120
    and account_name is not null
    and length(btrim(account_name)) between 1 and 120
    and account_number is not null
    and length(btrim(account_number)) between 6 and 34
    and exists (
      select 1
      from public.client_leads as sale
      where sale.id = commission_payments.lead_id
        and sale.realtor_id = public.current_active_realtor_id()
        and sale.status = 'successful'
        and sale.commission_amount = commission_payments.amount
        and sale.commission_amount > 0
    )
  );

-- Migration 007 grants inquiry visibility by assigned_to. Remove the older
-- referral-attribution policy because permissive RLS policies are ORed.
drop policy if exists "Realtors can read their own inquiries" on public.inquiries;

commit;
