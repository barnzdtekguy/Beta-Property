import type { createServiceRoleClient } from '@/lib/supabase/server';

// Commission paid at each level when an administrator approves a new agent.
// Index 0 = the direct referrer (level 1), index 1 = that referrer's own
// upline (level 2), and so on. To pay out a 3rd level
// too, just add another number — creditUplineCommissions() already walks
// as far up the chain as this array goes.
const COMMISSION_RATES = [2500, 500];

/**
 * Credits the direct referrer (level 1) and, if they were themselves
 * referred by someone, that upline too (level 2), and so on up the chain
 * — one row in `referrals` per level, each with its own commission amount.
 * Stops when either the chain runs out or COMMISSION_RATES does.
 *
 * Called only after email verification and administrator approval. Upserts
 * make retries safe if the agent approval transaction needs to be retried.
 */
export async function creditUplineCommissions(
  supabase: ReturnType<typeof createServiceRoleClient>,
  directReferrerId: string,
  newUserId: string,
  directLinkId: string | null
) {
  let currentReferrerId: string | null = directReferrerId;
  let level = 1;

  while (currentReferrerId && level <= COMMISSION_RATES.length) {
    const { data: inserted, error: insertError } = await supabase
      .from('referrals')
      .upsert(
        {
      referrer_id: currentReferrerId,
      referred_user_id: newUserId,
      referral_link_id: level === 1 ? directLinkId : null,
      level,
      status: 'completed',
      commission_amount: COMMISSION_RATES[level - 1],
      commission_status: 'unpaid',
        },
        { onConflict: 'referrer_id,referred_user_id', ignoreDuplicates: true }
      )
      .select('id')
      .maybeSingle();

    if (insertError) throw insertError;

    if (inserted && level === 1 && directLinkId) {
      const { error: clickError } = await supabase.rpc('increment_referral_link_clicks', {
        referral_link_id: directLinkId,
      });
      if (clickError) throw clickError;
    }

    const { data: referrerRow, error: referrerError }: {
      data: { referred_by: string | null } | null;
      error: Error | null;
    } = await supabase
      .from('users')
      .select('referred_by')
      .eq('id', currentReferrerId)
      .single();

    if (referrerError) throw referrerError;
    currentReferrerId = referrerRow?.referred_by ?? null;
    level++;
  }
}
