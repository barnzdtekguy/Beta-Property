'use server';

import { portalPath } from '@/lib/paths';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentRealtor } from '@/lib/realtor-queries';

export async function applyForPayout(formData: FormData) {
  const realtor = await getCurrentRealtor();
  if (!realtor) redirect(portalPath('/login'));

  const leadId = String(formData.get('lead_id') ?? '');
  const accountName = String(formData.get('account_name') ?? '').trim();
  const accountNumber = String(formData.get('account_number') ?? '').trim();
  const bankName = String(formData.get('bank_name') ?? '').trim();

  if (!leadId) redirect(portalPath('/dashboard/leads'));

  if (!accountName || !accountNumber || !bankName) {
    redirect(
      `/dashboard/payout/${leadId}?error=${encodeURIComponent('Account name, account number, and bank are required.')}`
    );
  }

  const supabase = createClient();

  const { data: lead, error: leadErr } = await supabase
    .from('client_leads')
    .select('id, realtor_id, status, commission_amount')
    .eq('id', leadId)
    .maybeSingle();

  if (leadErr || !lead || lead.realtor_id !== realtor!.id || lead.status !== 'successful') {
    redirect(portalPath(`/dashboard/leads?error=${encodeURIComponent("That sale isn't available for payout.")}`));
  }

  const { data: existing } = await supabase
    .from('commission_payments')
    .select('id')
    .eq('lead_id', leadId)
    .maybeSingle();

  if (existing) {
    redirect(portalPath(`/dashboard/leads?error=${encodeURIComponent("You've already applied for this commission.")}`));
  }

  const { error } = await supabase.from('commission_payments').insert({
    user_id: realtor!.id,
    lead_id: leadId,
    amount: lead!.commission_amount ?? 0,
    status: 'pending',
    bank_name: bankName,
    account_number: accountNumber,
    account_name: accountName,
  });

  if (error) {
    console.error('[applyForPayout] insert failed:', error.message);
    redirect(portalPath(`/dashboard/payout/${leadId}?error=${encodeURIComponent("Couldn't submit your application. Try again.")}`));
  }

  redirect(portalPath(`/dashboard/leads?success=${encodeURIComponent('Payout application submitted.')}`));
}
