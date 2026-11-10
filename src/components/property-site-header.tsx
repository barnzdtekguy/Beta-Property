import Image from 'next/image';
import Link from 'next/link';

export default function PropertySiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[78px] max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
        <Link href="/" aria-label="Beta Property home" className="flex items-center">
          <Image
            src="/assets/beta-logo-transparent.png"
            alt="Beta Property"
            width={58}
            height={58}
            priority
            className="h-12 w-12 object-contain"
          />
        </Link>

        <nav aria-label="Main navigation" className="hidden items-center gap-7 text-[12px] font-semibold md:flex">
          <Link href="/" className="text-stone-600 transition hover:text-[#171719]">Home</Link>
          <Link href="/about" className="text-stone-600 transition hover:text-[#171719]">About us</Link>
          <Link href="/properties" aria-current="page" className="relative py-3 text-[#171719] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#f32e37]">Properties</Link>
          <Link href="/developments" className="text-stone-600 transition hover:text-[#171719]">Developments</Link>
          <Link href="/services" className="text-stone-600 transition hover:text-[#171719]">Services</Link>
          <Link href="/insights" className="text-stone-600 transition hover:text-[#171719]">Insights</Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/properties" className="hidden rounded-sm border border-stone-300 px-4 py-3 text-[11px] font-semibold transition hover:border-[#171719] sm:inline-flex">
            Explore properties
          </Link>
          <Link href="/contact" className="inline-flex items-center gap-5 rounded-sm bg-[#f32e37] px-4 py-3 text-[11px] font-semibold text-white transition hover:bg-[#d81e29] sm:px-5">
            Let’s talk <span aria-hidden="true" className="text-base leading-none">↗</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
