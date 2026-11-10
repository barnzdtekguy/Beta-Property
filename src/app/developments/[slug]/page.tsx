import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatContentDate, getPublishedContentBySlug } from '@/lib/marketing-content';
import { PublicFooter, PublicHeader } from '@/components/public-content-shell';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const development = await getPublishedContentBySlug('developments', params.slug);
  return development ? { title: `${development.title} | Beta Property`, description: development.excerpt } : {};
}

export default async function DevelopmentPage({ params }: { params: { slug: string } }) {
  const development = await getPublishedContentBySlug('developments', params.slug);
  if (!development) notFound();

  return (
    <main className="min-h-screen bg-white text-stone-900">
      <PublicHeader />
      <article className="mx-auto max-w-4xl px-5 py-12 md:py-20">
        <Link href="/developments" className="text-sm font-medium text-red-700 hover:underline">← All developments</Link>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-red-700">Development{development.location ? ` · ${development.location}` : ''}</p>
        <h1 className="mt-3 font-display text-4xl font-semibold leading-tight sm:text-5xl">{development.title}</h1>
        <p className="mt-5 text-lg leading-8 text-stone-600">{development.excerpt}</p>
        <p className="mt-4 text-sm text-stone-500">Published {formatContentDate(development.published_at)}</p>
        <div className="mt-10 space-y-5 text-base leading-8 text-stone-700">
          {development.content.split(/\n\s*\n/).map((paragraph, index) => <p key={index} className="whitespace-pre-line">{paragraph}</p>)}
        </div>
        <div className="mt-12 rounded-2xl bg-stone-100 p-6 sm:p-8">
          <h2 className="font-display text-xl font-semibold">Interested in this development?</h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">Speak with our team to get more information and arrange a viewing.</p>
          <Link href="/contact" className="mt-5 inline-flex rounded-lg bg-red-700 px-5 py-3 text-sm font-medium text-white hover:bg-red-800">Contact Beta Property</Link>
        </div>
      </article>
      <PublicFooter />
    </main>
  );
}
