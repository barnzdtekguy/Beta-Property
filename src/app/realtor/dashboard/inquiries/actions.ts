'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getCurrentRealtor } from '@/lib/realtor-queries';
import { portalPath } from '@/lib/paths';
import { createClient } from '@/lib/supabase/server';

const STATUSES = ['new', 'contacted', 'pending_transaction', 'closed', 'rejected'];

export async function updateAssignedInquiryStatus(formData: FormData) {
  const realtor = await getCurrentRealtor();
  if (!realtor) redirect(portalPath('/login'));

  const inquiryId = String(formData.get('inquiry_id') ?? '');
  const status = String(formData.get('status') ?? '');
  if (!inquiryId || !STATUSES.includes(status)) {
    redirect(portalPath('/dashboard?inquiry_error=invalid'));
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('inquiries')
    .update({ status })
    .eq('id', inquiryId)
    .eq('assigned_to', realtor.id)
    .select('id')
    .maybeSingle();

  if (error || !data) {
    console.error('[updateAssignedInquiryStatus] status update failed:', error?.message ?? 'No assigned inquiry updated');
    redirect(portalPath('/dashboard?inquiry_error=update'));
  }

  revalidatePath(portalPath('/dashboard'));
  redirect(portalPath('/dashboard?inquiry_updated=1'));
}

export async function addInquiryFollowUp(formData: FormData) {
  const realtor = await getCurrentRealtor();
  if (!realtor) redirect(portalPath('/login'));

  const inquiryId = String(formData.get('inquiry_id') ?? '');
  const details = String(formData.get('details') ?? '').trim();
  const activityType = String(formData.get('activity_type') ?? 'note');
  const followUpAtRaw = String(formData.get('follow_up_at') ?? '').trim();
  const followUpAt = followUpAtRaw ? new Date(followUpAtRaw) : null;

  if (
    !inquiryId ||
    details.length < 3 ||
    details.length > 4000 ||
    !['note', 'call', 'email', 'meeting'].includes(activityType) ||
    (followUpAt && !Number.isFinite(followUpAt.getTime()))
  ) {
    redirect(portalPath('/dashboard?inquiry_error=invalid'));
  }

  const supabase = createClient();
  const { error } = await supabase.from('follow_up_activities').insert({
    inquiry_id: inquiryId,
    agent_id: realtor.id,
    activity_type: activityType,
    details,
    follow_up_at: followUpAt?.toISOString() ?? null,
  });

  if (error) {
    console.error('[addInquiryFollowUp] follow-up insert failed:', error.message);
    redirect(portalPath('/dashboard?inquiry_error=follow-up'));
  }
  revalidatePath(portalPath('/dashboard'));
  redirect(portalPath('/dashboard?inquiry_updated=1'));
}
