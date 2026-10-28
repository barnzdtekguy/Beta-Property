'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { creditUplineCommissions } from '@/lib/commission';
import { portalPath } from '@/lib/paths';
import { getCurrentAdmin } from '@/lib/queries';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

const ALLOWED_STATUSES = ['active', 'inactive', 'rejected', 'suspended'] as const;
type AgentStatus = (typeof ALLOWED_STATUSES)[number];

export async function updateAgentStatus(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect(portalPath('/admin/login?error=not-authorized'));

  const agentId = String(formData.get('agent_id') ?? '');
  const status = String(formData.get('status') ?? '');
  if (!agentId || !ALLOWED_STATUSES.includes(status as AgentStatus)) {
    redirect(portalPath('/admin/users?error=invalid-agent-update'));
  }

  const supabase = createClient();
  const { data: agent, error: lookupError } = await supabase
    .from('users')
    .select('id, status, email_verified_at, referred_by, signup_referral_link_id')
    .eq('id', agentId)
    .maybeSingle();

  if (lookupError) {
    console.error('[updateAgentStatus] agent lookup failed:', lookupError.message);
    redirect(portalPath('/admin/users?error=agent-update-failed'));
  }
  if (!agent) redirect(portalPath('/admin/users?error=agent-not-found'));
  if (status === 'active' && !agent.email_verified_at) {
    redirect(portalPath('/admin/users?error=email-not-verified'));
  }

  if (status === 'active' && agent.status === 'pending' && agent.referred_by) {
    try {
      await creditUplineCommissions(
        createServiceRoleClient(),
        agent.referred_by,
        agent.id,
        agent.signup_referral_link_id
      );
    } catch (error) {
      console.error('[updateAgentStatus] referral commission credit failed:', error);
      redirect(portalPath('/admin/users?error=commission-credit-failed'));
    }
  }

  const { data: updated, error: updateError } = await supabase
    .from('users')
    .update({ status })
    .eq('id', agentId)
    .select('id')
    .maybeSingle();

  if (updateError || !updated) {
    console.error('[updateAgentStatus] status update failed:', updateError?.message ?? 'No row updated');
    redirect(portalPath('/admin/users?error=agent-update-failed'));
  }

  revalidatePath(portalPath('/admin/users'));
  revalidatePath(portalPath(`/admin/users/${agentId}`));
  redirect(portalPath('/admin/users?updated=1'));
}
