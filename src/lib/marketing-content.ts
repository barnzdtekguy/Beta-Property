import { createClient } from '@/lib/supabase/server';

export type MarketingContentKind = 'developments' | 'insights';

export interface MarketingContent {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  location?: string | null;
  category?: string | null;
  cover_image_url?: string | null;
  status: 'draft' | 'published' | 'archived';
  published_at: string | null;
  created_at: string;
}

const contentSelect: Record<MarketingContentKind, string> = {
  developments: 'id, slug, title, excerpt, content, location, cover_image_path, status, published_at, created_at',
  insights: 'id, slug, title, excerpt, content, category, status, published_at, created_at',
};

function isMissingDevelopmentImageColumn(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  if (error.code === '42703' || error.code === 'PGRST204') return true;

  const message = error.message?.toLowerCase() ?? '';
  return message.includes('cover_image_path') && /does not exist|could not find|schema cache/.test(message);
}

export function isMissingDevelopmentTableError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  if (error.code === '42P01' || error.code === 'PGRST205') return true;

  const message = error.message?.toLowerCase() ?? '';
  return message.includes('developments') && /does not exist|could not find|schema cache/.test(message);
}

async function queryPublishedContent(supabase: Awaited<ReturnType<typeof createClient>>, kind: MarketingContentKind, slug?: string) {
  const query = (select: string) => {
    const builder = supabase.from(kind).select(select).eq('status', 'published');
    return slug ? builder.eq('slug', slug).maybeSingle() : builder.order('published_at', { ascending: false });
  };

  let result = await query(contentSelect[kind]);
  if (kind === 'developments' && isMissingDevelopmentImageColumn(result.error)) {
    const legacySelect = contentSelect.developments.replace(', cover_image_path', '');
    result = await query(legacySelect);
  }
  return result;
}

export async function getPublishedContent(kind: MarketingContentKind) {
  const supabase = await createClient();
  const { data, error } = await queryPublishedContent(supabase, kind);

  if (error) {
    if (kind === 'developments' && isMissingDevelopmentTableError(error)) return [];
    throw error;
  }
  const rows = (data ?? []) as any[];
  if (kind !== 'developments') return rows as unknown as MarketingContent[];

  return Promise.all(rows.map(async (row: any) => {
    if (!row.cover_image_path) return { ...row, cover_image_url: null };
    const { data: image } = await supabase.storage.from('development-images').createSignedUrl(row.cover_image_path, 3600);
    return { ...row, cover_image_url: image?.signedUrl ?? null };
  })) as Promise<MarketingContent[]>;
}

export async function getPublishedContentBySlug(kind: MarketingContentKind, slug: string) {
  const supabase = await createClient();
  const { data, error } = await queryPublishedContent(supabase, kind, slug);

  if (error) {
    if (kind === 'developments' && isMissingDevelopmentTableError(error)) return null;
    throw error;
  }
  if (!data) return null;
  if (kind !== 'developments') return data as unknown as MarketingContent;

  const development = data as any;
  if (!development.cover_image_path) return { ...development, cover_image_url: null } as MarketingContent;
  const { data: image } = await supabase.storage.from('development-images').createSignedUrl(development.cover_image_path, 3600);
  return { ...development, cover_image_url: image?.signedUrl ?? null } as MarketingContent;
}

export function formatContentDate(value: string | null) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-NG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}
