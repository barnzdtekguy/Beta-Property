import type { Metadata } from 'next';
import Link from 'next/link';
import { getPublishedContent, formatContentDate } from '@/lib/marketing-content';
import { EmptyState, PublicFooter, PublicHeader } from '@/components/public-content-shell';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Developments | Beta Property',
  description: 'Explore property developments from Beta Property.',
};

export default async function DevelopmentsPage() {
  const developments = await getPublishedContent('developments');

  return (
    <main className="min-h-screen bg-white text-stone-900">
      <PublicHeader />
      <section className="mx-auto max-w-7xl px-5 py-14 md:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-700">Our developments</p>
        <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold leading-tight sm:text-5xl">Places to build your next chapter.</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-stone-600">Explore property projects selected to support confident ownership and long-term value.</p>
        {developments.length ? (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {developments.map((item) => (
              <Link key={item.id} href={`/developments/${item.slug}`} className="group flex min-h-64 flex-col rounded-2xl border border-stone-200 bg-stone-50 p-6 transition hover:-translate-y-1 hover:border-stone-300 hover:shadow-lg">
                <div className="flex items-center justify-between gap-3 text-xs font-medium uppercase tracking-wide text-red-700">
                  <span>Development</span><span className="text-stone-500">{formatContentDate(item.published_at)}</span>
                </div>
                <h2 className="mt-5 font-display text-2xl font-semibold leading-snug group-hover:text-red-800">{item.title}</h2>
                {item.location && <p className="mt-2 text-sm font-medium text-stone-500">{item.location}</p>}
                <p className="mt-3 flex-1 text-sm leading-6 text-stone-600">{item.excerpt}</p>
                <span className="mt-6 text-sm font-semibold text-stone-900">Explore development <span aria-hidden>→</span></span>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState title="New developments are on the way" message="Our team is preparing project details. Please check back soon or speak with us about current opportunities." />
        )}
      </section>
      <PublicFooter />
    </main>
  );
}
