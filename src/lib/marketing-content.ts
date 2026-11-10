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

export async function getPublishedContent(kind: MarketingContentKind) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from(kind)
    .select(contentSelect[kind])
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  if (error) throw error;
  const rows = data ?? [];
  if (kind !== 'developments') return rows as unknown as MarketingContent[];

  return Promise.all(rows.map(async (row: any) => {
    if (!row.cover_image_path) return { ...row, cover_image_url: null };
    const { data: image } = await supabase.storage.from('development-images').createSignedUrl(row.cover_image_path, 3600);
    return { ...row, cover_image_url: image?.signedUrl ?? null };
  })) as Promise<MarketingContent[]>;
}

export async function getPublishedContentBySlug(kind: MarketingContentKind, slug: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from(kind)
    .select(contentSelect[kind])
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  if (error) throw error;
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
