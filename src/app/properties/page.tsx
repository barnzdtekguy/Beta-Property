import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, BedDouble, MapPin, Ruler } from 'lucide-react';
import PropertySiteHeader from '@/components/property-site-header';
import { getPublishedProperties, type PropertyFilters, formatPropertyPrice } from '@/lib/properties';

export const dynamic = 'force-dynamic';

const propertyTypes = ['land', 'house', 'duplex', 'apartment', 'commercial', 'other'];

function labelFor(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<PropertyFilters>;
}) {
  const resolvedSearchParams = await searchParams;
  const properties = await getPublishedProperties(resolvedSearchParams);

  return (
    <main className="min-h-screen bg-[#f8f7f5] text-[#171719]">
      <PropertySiteHeader />

      <section className="relative overflow-hidden bg-[#171719] text-white">
        <div aria-hidden="true" className="absolute -right-36 -top-56 h-[520px] w-[520px] rounded-full border border-white/[0.07]" />
        <div aria-hidden="true" className="absolute -right-16 -top-36 h-[360px] w-[360px] rounded-full border border-white/[0.08]" />
        <div className="relative mx-auto max-w-[1440px] px-5 pb-24 pt-16 sm:px-8 sm:pt-20 lg:px-12 lg:pb-28">
          <p className="mb-5 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">
            <span className="h-0.5 w-6 bg-[#f32e37]" />
            Find your next chapter
          </p>
          <h1 className="max-w-3xl font-display text-4xl font-semibold leading-[1.08] tracking-[-0.045em] sm:text-5xl lg:text-6xl">
            A place for what’s <span className="font-serif font-normal italic">next.</span>
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-7 text-white/70 sm:text-base">
            Explore available homes, land and commercial properties. When one feels right, our team is here to help with the next step.
          </p>
        </div>
      </section>

      <section aria-label="Filter properties" className="relative z-10 mx-auto -mt-10 max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <form action="/properties" className="grid gap-4 rounded-md border border-stone-200 bg-white p-5 shadow-[0_12px_42px_rgba(23,23,25,0.08)] sm:grid-cols-2 lg:grid-cols-[1.35fr_1fr_1fr_1fr_1fr_auto] lg:items-end lg:gap-5 lg:p-6">
          <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500">
            Location
            <span className="relative mt-2 block">
              <MapPin aria-hidden="true" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#f32e37]" />
              <input
                name="location"
                defaultValue={resolvedSearchParams.location}
                placeholder="City, state or area"
                className="h-11 w-full rounded-sm border border-stone-200 bg-white pl-9 pr-3 text-sm font-normal normal-case tracking-normal text-[#171719] outline-none transition placeholder:text-stone-400 focus:border-[#f32e37]"
              />
            </span>
          </label>
          <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500">
            Property type
            <select name="type" defaultValue={resolvedSearchParams.type ?? ''} className="mt-2 h-11 w-full rounded-sm border border-stone-200 bg-white px-3 text-sm font-normal normal-case tracking-normal text-[#171719] outline-none focus:border-[#f32e37]">
              <option value="">All types</option>
              {propertyTypes.map((type) => <option key={type} value={type}>{labelFor(type)}</option>)}
            </select>
          </label>
          <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500">
            Listing
            <select name="listing" defaultValue={resolvedSearchParams.listing ?? ''} className="mt-2 h-11 w-full rounded-sm border border-stone-200 bg-white px-3 text-sm font-normal normal-case tracking-normal text-[#171719] outline-none focus:border-[#f32e37]">
              <option value="">Sale or rent</option>
              <option value="sale">For sale</option>
              <option value="rent">For rent</option>
              <option value="lease">For lease</option>
            </select>
          </label>
          <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500">
            Minimum price
            <input name="minPrice" type="number" min="0" defaultValue={resolvedSearchParams.minPrice} placeholder="No minimum" className="mt-2 h-11 w-full rounded-sm border border-stone-200 bg-white px-3 text-sm font-normal normal-case tracking-normal text-[#171719] outline-none placeholder:text-stone-400 focus:border-[#f32e37]" />
          </label>
          <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500">
            Maximum price
            <input name="maxPrice" type="number" min="0" defaultValue={resolvedSearchParams.maxPrice} placeholder="No maximum" className="mt-2 h-11 w-full rounded-sm border border-stone-200 bg-white px-3 text-sm font-normal normal-case tracking-normal text-[#171719] outline-none placeholder:text-stone-400 focus:border-[#f32e37]" />
          </label>
          <button className="inline-flex h-11 items-center justify-center gap-4 rounded-sm bg-[#f32e37] px-5 text-xs font-semibold text-white transition hover:bg-[#d81e29]">
            Find a place <ArrowUpRight aria-hidden="true" size={17} />
          </button>
        </form>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 pb-24 pt-14 sm:px-8 lg:px-12 lg:pt-16">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-stone-200 pb-5">
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#f32e37]">The collection</p>
            <h2 className="font-display text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">Available properties</h2>
          </div>
          <p className="text-xs text-stone-500">
            <span className="font-semibold text-[#171719]">{properties.length}</span> {properties.length === 1 ? 'property' : 'properties'}
          </p>
        </div>

        {properties.length ? (
          <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((property) => {
              const cover = property.property_images[0];
              const location = [property.neighborhood, property.city, property.state].filter(Boolean).join(', ');
              return (
                <Link
                  key={property.id}
                  href={`/properties/${property.slug}`}
                  className="group min-w-0"
                >
                  <div className="relative aspect-[1.27] overflow-hidden rounded-sm bg-stone-200">
                    {cover ? (
                      <Image
                        src={cover.url}
                        alt={cover.alt_text}
                        fill
                        unoptimized
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition duration-700 ease-out group-hover:scale-[1.04]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center px-6 text-center text-sm text-stone-500">
                        Property photography coming soon
                      </div>
                    )}
                    <div className="absolute left-4 top-4 flex gap-2">
                      <span className="bg-white px-3 py-2 text-[9px] font-bold uppercase tracking-[0.12em]">{labelFor(property.listing_type)}</span>
                      <span className="bg-[#171719]/85 px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-white">{labelFor(property.property_type)}</span>
                    </div>
                    <span className="absolute bottom-4 right-4 grid h-9 w-9 place-items-center rounded-full border border-white/70 bg-black/10 text-white transition group-hover:border-[#f32e37] group-hover:bg-[#f32e37]">
                      <ArrowUpRight aria-hidden="true" size={18} />
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-4 border-b border-stone-200 py-5">
                    <div className="min-w-0">
                      <h3 className="truncate font-display text-lg font-semibold tracking-[-0.025em] transition group-hover:text-[#d81e29]">{property.title}</h3>
                      {location && (
                        <p className="mt-2 flex items-center gap-1.5 text-xs text-stone-500">
                          <MapPin aria-hidden="true" size={14} className="shrink-0 text-[#f32e37]" /> {location}
                        </p>
                      )}
                      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-stone-500">
                        {property.bedrooms !== null && <span className="inline-flex items-center gap-1.5"><BedDouble aria-hidden="true" size={14} /> {property.bedrooms} beds</span>}
                        {property.area && <span className="inline-flex items-center gap-1.5"><Ruler aria-hidden="true" size={14} /> {property.area} {property.area_unit}</span>}
                      </div>
                      {property.negotiable && <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-700">Price negotiable</p>}
                    </div>
                    <p className="shrink-0 pt-1 text-right text-sm font-bold">{formatPropertyPrice(property.price, property.currency, property.listing_type)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="border border-dashed border-stone-300 bg-white px-6 py-20 text-center">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#f32e37]">No matches just yet</p>
            <h2 className="font-display text-2xl font-semibold tracking-[-0.03em]">Try widening your search.</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-stone-600">
              Adjust your filters or clear them to see all currently available properties.
            </p>
            <Link href="/properties" className="mt-6 inline-flex items-center gap-3 border-b border-[#f32e37] pb-1 text-xs font-semibold">
              View all properties <ArrowUpRight aria-hidden="true" size={16} className="text-[#f32e37]" />
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
