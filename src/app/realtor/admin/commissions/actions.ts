'use server';

import { portalPath } from '@/lib/paths';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getCurrentAdmin } from '@/lib/queries';
import { createClient } from '@/lib/supabase/server';

export async function approvePayout(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect(portalPath('/admin/login?error=not-authorized'));

  const paymentId = String(formData.get('payment_id') ?? '');
  if (!paymentId) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from('commission_payments')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', paymentId);

  if (error) console.error('[approvePayout] update failed:', error.message);

  revalidatePath(portalPath('/admin/commissions'));
}

export async function rejectPayout(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect(portalPath('/admin/login?error=not-authorized'));

  const paymentId = String(formData.get('payment_id') ?? '');
  if (!paymentId) return;

  const supabase = await createClient();
  const { error } = await supabase.from('commission_payments').update({ status: 'failed' }).eq('id', paymentId);

  if (error) console.error('[rejectPayout] update failed:', error.message);

  revalidatePath(portalPath('/admin/commissions'));
}
