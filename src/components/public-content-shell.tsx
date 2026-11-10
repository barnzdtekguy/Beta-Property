import Link from 'next/link';
import { PublicBrandLogo } from '@/components/public-brand-logo';

export function PublicHeader() {
  return (
    <header className="border-b border-stone-200">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-2 sm:flex-row sm:items-center sm:justify-between sm:py-2">
        <PublicBrandLogo />
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:gap-x-6 sm:text-sm">
          <Link href="/properties" className="text-stone-600 hover:text-stone-950">Properties</Link>
          <Link href="/developments" className="text-stone-600 hover:text-stone-950">Developments</Link>
          <Link href="/insights" className="text-stone-600 hover:text-stone-950">Insights</Link>
          <Link href="/contact" className="text-stone-600 hover:text-stone-950">Contact</Link>
        </nav>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-stone-200">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-6 text-sm text-stone-500 sm:flex-row sm:items-center sm:justify-between">
        <span>Beta Property</span><Link href="/contact" className="hover:text-stone-900">Talk to our team</Link>
      </div>
    </footer>
  );
}

export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="mt-10 rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-6 py-14 text-center">
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-stone-600">{message}</p>
    </div>
  );
}
