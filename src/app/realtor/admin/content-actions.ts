'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getCurrentAdmin } from '@/lib/queries';
import { portalPath } from '@/lib/paths';
import { createClient } from '@/lib/supabase/server';
import type { MarketingContentKind } from '@/lib/marketing-content';

function contentKind(value: FormDataEntryValue | null): MarketingContentKind | null {
  return value === 'developments' || value === 'insights' ? value : null;
}

function slugify(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function isMissingDevelopmentImageColumn(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  if (error.code === '42703' || error.code === 'PGRST204') return true;

  const message = error.message?.toLowerCase() ?? '';
  return message.includes('cover_image_path') && /does not exist|could not find|schema cache/.test(message);
}

function returnTo(kind: MarketingContentKind, query: string): never {
  redirect(`${portalPath(`/admin/${kind}`)}${query}`);
}

function revalidateContent(kind: MarketingContentKind, slug?: string) {
  revalidatePath(portalPath(`/admin/${kind}`));
  revalidatePath(`/${kind}`);
  if (slug) revalidatePath(`/${kind}/${slug}`);
}

export async function saveMarketingContent(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect(portalPath('/admin/login?error=not-authorized'));

  const kind = contentKind(formData.get('content_type'));
  if (!kind) redirect(portalPath('/admin?error=invalid-content-type'));

  const id = String(formData.get('id') ?? '').trim();
  const intent = String(formData.get('intent') ?? 'draft');
  const title = String(formData.get('title') ?? '').trim();
  const slug = slugify(String(formData.get('slug') || title).trim());
  const excerpt = String(formData.get('excerpt') ?? '').trim();
  const content = String(formData.get('content') ?? '').trim();
  const location = String(formData.get('location') ?? '').trim();
  const category = String(formData.get('category') ?? '').trim();
  const coverImagePath = String(formData.get('cover_image_path') ?? '').trim();

  if (
    title.length < 3 || title.length > 180 || !slug || slug.length > 180 ||
    excerpt.length < 10 || excerpt.length > 500 || content.length < 30 || content.length > 30000 ||
    (kind === 'developments' && (
      location.length > 160 ||
      (coverImagePath !== '' && !/^developments\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(?:jpg|png|webp)$/i.test(coverImagePath))
    )) ||
    (kind === 'insights' && (category.length < 2 || category.length > 80))
  ) {
    returnTo(kind, '?error=check-fields');
  }

  const supabase = await createClient();
  let previousCoverImagePath: string | null = null;
  let hasCoverImageColumn = Boolean(coverImagePath);
  if (id && kind === 'developments') {
    const { data: existing, error: lookupError } = await supabase
      .from('developments')
      .select('id, cover_image_path')
      .eq('id', id)
      .maybeSingle();
    if (isMissingDevelopmentImageColumn(lookupError)) {
      hasCoverImageColumn = false;
    } else if (lookupError || !existing) {
      returnTo(kind, '?error=save-failed');
    } else {
      hasCoverImageColumn = true;
      previousCoverImagePath = existing.cover_image_path;
    }
  }

  if (kind === 'developments' && coverImagePath && !hasCoverImageColumn) {
    returnTo(kind, '?error=image-storage-not-ready');
  }

  const values = kind === 'developments'
    ? {
        title,
        slug,
        excerpt,
        content,
        location: location || null,
        ...(hasCoverImageColumn ? { cover_image_path: coverImagePath || null } : {}),
      }
    : { title, slug, excerpt, content, category };

  const result = id
    ? await supabase
        .from(kind)
        .update(intent === 'publish'
          ? { ...values, status: 'published', published_at: new Date().toISOString() }
          : values)
        .eq('id', id)
        .select('id')
        .maybeSingle()
    : await supabase
        .from(kind)
        .insert({
          ...values,
          status: intent === 'publish' ? 'published' : 'draft',
          published_at: intent === 'publish' ? new Date().toISOString() : null,
          created_by: admin.id,
        })
        .select('id')
        .single();

  if (result.error || !result.data) {
    console.error('[saveMarketingContent] save failed:', result.error?.message ?? 'No content saved');
    returnTo(kind, result.error?.code === '23505' ? '?error=slug-taken' : '?error=save-failed');
  }

  if (kind === 'developments' && previousCoverImagePath && previousCoverImagePath !== (coverImagePath || null)) {
    const { error: removalError } = await supabase.storage.from('development-images').remove([previousCoverImagePath]);
    if (removalError) console.error('[saveMarketingContent] old cover image cleanup failed:', removalError.message);
  }

  revalidateContent(kind, slug);
  returnTo(kind, intent === 'publish' ? '?published=1' : id ? '?saved=1' : '?created=1');
}

export async function changeMarketingContentStatus(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect(portalPath('/admin/login?error=not-authorized'));

  const kind = contentKind(formData.get('content_type'));
  const id = String(formData.get('id') ?? '').trim();
  const status = String(formData.get('status') ?? '');
  if (!kind || !id || !['draft', 'published', 'archived'].includes(status)) {
    redirect(portalPath('/admin?error=invalid-content-status'));
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from(kind)
    .update({ status, published_at: status === 'published' ? new Date().toISOString() : null })
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error || !data) {
    console.error('[changeMarketingContentStatus] status update failed:', error?.message ?? 'No content updated');
    returnTo(kind, '?error=status-failed');
  }

  revalidateContent(kind);
  returnTo(kind, '?saved=1');
}
