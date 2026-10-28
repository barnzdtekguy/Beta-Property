'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getCurrentAdmin } from '@/lib/queries';
import { portalPath } from '@/lib/paths';
import { createClient } from '@/lib/supabase/server';

const STATUSES = ['new', 'contacted', 'pending_transaction', 'closed', 'rejected'];

export async function updateInquiry(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect(portalPath('/admin/login?error=not-authorized'));

  const inquiryId = String(formData.get('inquiry_id') ?? '');
  const status = String(formData.get('status') ?? '');
  const agentId = String(formData.get('assigned_to') ?? '') || null;
  if (!inquiryId || !STATUSES.includes(status)) {
    redirect(portalPath('/admin/inquiries?error=invalid-update'));
  }

  const supabase = createClient();
  if (agentId) {
    const { data: agent, error: agentError } = await supabase
      .from('users')
      .select('id')
      .eq('id', agentId)
      .eq('status', 'active')
      .maybeSingle();
    if (agentError || !agent) {
      redirect(portalPath('/admin/inquiries?error=agent-not-active'));
    }
  }

  const { error } = await supabase
    .from('inquiries')
    .update({ status, assigned_to: agentId })
    .eq('id', inquiryId);

  if (error) {
    console.error('[updateInquiry] update failed:', error.message);
    redirect(portalPath('/admin/inquiries?error=update-failed'));
  }

  revalidatePath(portalPath('/admin/inquiries'));
  revalidatePath(portalPath('/dashboard'));
  redirect(portalPath('/admin/inquiries?updated=1'));
}
