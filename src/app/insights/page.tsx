import type { Metadata } from 'next';
import Link from 'next/link';
import { formatContentDate, getPublishedContent } from '@/lib/marketing-content';
import { EmptyState, PublicFooter, PublicHeader } from '@/components/public-content-shell';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Real Estate Insights | Beta Property',
  description: 'Guidance and updates to help you make informed real estate decisions.',
};

export default async function InsightsPage() {
  const insights = await getPublishedContent('insights');

  return (
    <main className="min-h-screen bg-white text-stone-900">
      <PublicHeader />
      <section className="mx-auto max-w-7xl px-5 py-14 md:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-700">The Beta Property journal</p>
        <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold leading-tight sm:text-5xl">Insight for your next property decision.</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-stone-600">Clear guidance, market perspectives, and practical ideas for buyers and investors.</p>
        {insights.length ? (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {insights.map((item) => (
              <Link key={item.id} href={`/insights/${item.slug}`} className="group flex min-h-64 flex-col rounded-2xl border border-stone-200 bg-white p-6 transition hover:-translate-y-1 hover:border-stone-300 hover:shadow-lg">
                <div className="flex items-center justify-between gap-3 text-xs font-medium uppercase tracking-wide text-red-700">
                  <span>{item.category || 'Insights'}</span><span className="text-stone-500">{formatContentDate(item.published_at)}</span>
                </div>
                <h2 className="mt-5 font-display text-2xl font-semibold leading-snug group-hover:text-red-800">{item.title}</h2>
                <p className="mt-3 flex-1 text-sm leading-6 text-stone-600">{item.excerpt}</p>
                <span className="mt-6 text-sm font-semibold text-stone-900">Read article <span aria-hidden>→</span></span>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState title="Fresh insights are coming soon" message="We are preparing practical real estate guidance for buyers and investors. Check back soon for our latest articles." />
        )}
      </section>
      <PublicFooter />
    </main>
  );
}
