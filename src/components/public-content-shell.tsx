import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { PublicBrandLogo } from '@/components/public-brand-logo';

const publicLinks = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About us' },
  { href: '/properties', label: 'Properties' },
  { href: '/developments', label: 'Developments' },
  { href: '/services', label: 'Services' },
  { href: '/insights', label: 'Insights' },
];

export function PublicHeader({ activePath }: { activePath?: string } = {}) {
  return (
    <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-x-5 px-5 py-3 sm:px-8 lg:px-12">
        <PublicBrandLogo />
        <nav aria-label="Main navigation" className="order-3 flex w-full flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-stone-100 pt-3 text-[11px] font-semibold sm:gap-x-6 md:order-none md:w-auto md:border-0 md:pt-0 md:text-xs">
          {publicLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              aria-current={activePath === href ? 'page' : undefined}
              className={activePath === href ? 'text-[#171719]' : 'text-stone-600 transition hover:text-[#171719]'}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/realtor/register" className="hidden rounded-sm border border-stone-300 px-3 py-3 text-[10px] font-semibold transition hover:border-[#171719] sm:inline-flex">
            Register as a realtor
          </Link>
          <Link href="/contact" className="inline-flex items-center gap-3 rounded-sm bg-[#f32e37] px-4 py-3 text-[11px] font-semibold text-white transition hover:bg-[#d81e29] sm:px-5">
            Let’s talk <ArrowUpRight aria-hidden="true" size={16} strokeWidth={1.8} />
          </Link>
        </div>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="bg-[#171719] text-white">
      <div className="mx-auto grid max-w-[1440px] gap-9 px-5 py-12 sm:px-8 md:grid-cols-[1.3fr_1fr_1fr_1fr] lg:px-12 lg:py-16">
        <div>
          <div className="inline-flex rounded bg-white px-2 py-1">
            <PublicBrandLogo />
          </div>
          <p className="mt-4 max-w-xs text-sm leading-6 text-white/65">A better address. A bolder future. Explore property opportunities in Lagos and Abuja.</p>
        </div>
        <FooterColumn title="Explore" links={[
          ['/about', 'About Beta'], ['/properties', 'Properties'], ['/developments', 'Developments'], ['/services', 'Our services'],
        ]} />
        <FooterColumn title="Go further" links={[
          ['/partners', 'Partner with us'], ['/realtor/register', 'Submit a property'], ['/buying-guide', 'Buying guide & FAQs'], ['/insights', 'Insights'],
        ]} />
        <div className="space-y-3 text-sm">
          <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-white/50">Let’s connect</h2>
          <a className="block hover:text-white/75" href="tel:+2349079440776">0907 944 0776</a>
          <a className="block hover:text-white/75" href={`https://wa.me/2349079440776?text=${encodeURIComponent('Hello Beta Property, I would like to enquire about property opportunities in Lagos and Abuja.')}`} target="_blank" rel="noopener noreferrer">Chat on WhatsApp <ArrowUpRight aria-hidden="true" className="inline" size={14} /></a>
          <Link className="block hover:text-white/75" href="/contact">Talk to our team <ArrowUpRight aria-hidden="true" className="inline" size={14} /></Link>
          <span className="block text-white/55">Lagos &amp; Abuja, Nigeria</span>
        </div>
      </div>
      <div className="mx-auto flex max-w-[1440px] flex-wrap justify-between gap-3 border-t border-white/10 px-5 py-5 text-xs text-white/55 sm:px-8 lg:px-12">
        <span>© {new Date().getFullYear()} Beta Property. All rights reserved.</span>
        <div className="flex gap-5">
          <Link href="/privacy" className="hover:text-white">Privacy notice</Link>
          <Link href="/terms" className="hover:text-white">Terms of use</Link>
          <a href="#" className="hover:text-white">Back to top</a>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div className="space-y-3 text-sm">
      <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-white/50">{title}</h2>
      {links.map(([href, label]) => <Link key={href} href={href} className="block hover:text-white/75">{label}</Link>)}
    </div>
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
