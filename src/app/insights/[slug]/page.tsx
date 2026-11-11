import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { formatContentDate, getPublishedContentBySlug } from '@/lib/marketing-content';
import { PublicFooter, PublicHeader } from '@/components/public-content-shell';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const insight = await getPublishedContentBySlug('insights', slug);
  return insight ? { title: `${insight.title} | Beta Property`, description: insight.excerpt } : {};
}

export default async function InsightPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const insight = await getPublishedContentBySlug('insights', slug);
  if (!insight) notFound();

  return (
    <main className="min-h-screen bg-white text-stone-900">
      <PublicHeader />
      <article className="mx-auto max-w-4xl px-5 py-12 md:py-20">
        <Link href="/insights" className="inline-flex items-center gap-2 text-sm font-medium text-red-700 hover:underline"><ArrowLeft aria-hidden="true" size={16} strokeWidth={1.8} /> All insights</Link>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-red-700">{insight.category || 'Insights'}</p>
        <h1 className="mt-3 font-display text-4xl font-semibold leading-tight sm:text-5xl">{insight.title}</h1>
        <p className="mt-5 text-lg leading-8 text-stone-600">{insight.excerpt}</p>
        <p className="mt-4 text-sm text-stone-500">Published {formatContentDate(insight.published_at)}</p>
        <div className="mt-10 space-y-5 text-base leading-8 text-stone-700">
          {insight.content.split(/\n\s*\n/).map((paragraph, index) => <p key={index} className="whitespace-pre-line">{paragraph}</p>)}
        </div>
        <Link href="/contact" className="mt-12 inline-flex rounded-lg bg-red-700 px-5 py-3 text-sm font-medium text-white hover:bg-red-800">Talk to our team</Link>
      </article>
      <PublicFooter />
    </main>
  );
}
