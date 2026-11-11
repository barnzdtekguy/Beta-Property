'use server';

import { portalPath } from '@/lib/paths';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getCurrentAdmin } from '@/lib/queries';
import { createClient } from '@/lib/supabase/server';

export async function postAnnouncement(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect(portalPath('/admin/login?error=not-authorized'));

  const title = String(formData.get('title') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();

  if (!title || !body) {
    redirect(portalPath(`/admin/announcements?error=${encodeURIComponent('Title and message are required.')}`));
  }

  const supabase = await createClient();

  const { error } = await supabase.from('announcements').insert({
    admin_id: admin.id,
    title,
    body,
  });

  if (error) {
    console.error('[postAnnouncement] insert failed:', error.message);
    redirect(portalPath(`/admin/announcements?error=${encodeURIComponent("Couldn't post this announcement.")}`));
  }

  revalidatePath(portalPath('/admin/announcements'));
  redirect(portalPath(`/admin/announcements?success=${encodeURIComponent('Announcement sent to all realtors.')}`));
}
