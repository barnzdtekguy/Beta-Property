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
  status: 'draft' | 'published' | 'archived';
  published_at: string | null;
  created_at: string;
}

const contentSelect: Record<MarketingContentKind, string> = {
  developments: 'id, slug, title, excerpt, content, location, status, published_at, created_at',
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
  return (data ?? []) as MarketingContent[];
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
  return (data ?? null) as MarketingContent | null;
}

export function formatContentDate(value: string | null) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-NG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}
