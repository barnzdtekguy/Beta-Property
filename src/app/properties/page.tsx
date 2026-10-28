import Link from 'next/link';
import Image from 'next/image';
import { getPublishedProperties, type PropertyFilters, formatPropertyPrice } from '@/lib/properties';

export const dynamic = 'force-dynamic';

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: PropertyFilters;
}) {
  const properties = await getPublishedProperties(searchParams);

  return (
    <main className="min-h-screen bg-white text-stone-900">
      <header className="border-b border-stone-200">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
          <Link href="/" className="font-display text-lg font-semibold">Beta Property</Link>
          <nav className="flex items-center gap-5 text-sm">
            <Link href="/" className="text-stone-600 hover:text-stone-950">Home</Link>
            <Link href="/realtor/register" className="text-stone-600 hover:text-stone-950">Realtor portal</Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-12 md:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Beta Property</p>
        <h1 className="mt-3 font-display text-4xl font-semibold md:text-5xl">Available properties</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          Explore properties currently approved for publication. Contact us to request details or an inspection.
        </p>

        <form className="mt-8 grid gap-3 rounded-xl border border-stone-200 bg-stone-50 p-4 sm:grid-cols-2 lg:grid-cols-6" action="/properties">
          <label className="text-xs font-medium text-stone-600">
            Location
            <input name="location" defaultValue={searchParams.location} className="mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900" />
          </label>
          <label className="text-xs font-medium text-stone-600">
            Property type
            <select name="type" defaultValue={searchParams.type ?? ''} className="mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900">
              <option value="">All types</option>
              {['land', 'house', 'apartment', 'commercial', 'other'].map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-stone-600">
            Listing
            <select name="listing" defaultValue={searchParams.listing ?? ''} className="mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900">
              <option value="">Sale or rent</option>
              <option value="sale">For sale</option>
              <option value="rent">For rent</option>
              <option value="lease">For lease</option>
            </select>
          </label>
          <label className="text-xs font-medium text-stone-600">
            Minimum price
            <input name="minPrice" type="number" min="0" defaultValue={searchParams.minPrice} className="mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900" />
          </label>
          <label className="text-xs font-medium text-stone-600">
            Maximum price
            <input name="maxPrice" type="number" min="0" defaultValue={searchParams.maxPrice} className="mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900" />
          </label>
          <div className="flex items-end">
            <button className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-dark">Filter properties</button>
          </div>
        </form>

        <p className="mt-8 text-sm text-stone-500">{properties.length} published {properties.length === 1 ? 'property' : 'properties'}</p>
        {properties.length ? (
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((property) => {
              const cover = property.property_images[0];
              return (
                <Link key={property.id} href={`/properties/${property.slug}`} className="overflow-hidden rounded-xl border border-stone-200 bg-white transition hover:-translate-y-0.5 hover:shadow-lg">
                  <div className="relative flex aspect-[4/3] items-center justify-center bg-stone-100">
                    {cover ? <Image src={cover.url} alt={cover.alt_text} fill unoptimized sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover" /> : <span className="text-sm text-stone-500">Property photo not available</span>}
                  </div>
                  <div className="p-5">
                    <p className="text-xs font-medium uppercase tracking-wide text-brand">{property.listing_type} · {property.property_type}</p>
                    <h2 className="mt-2 font-display text-lg font-semibold">{property.title}</h2>
                    <p className="mt-1 text-sm text-stone-600">{property.city}{property.state ? `, ${property.state}` : ''}</p>
                    <p className="mt-4 text-sm font-semibold">{formatPropertyPrice(property.price, property.currency, property.listing_type)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-stone-300 px-6 py-16 text-center">
            <h2 className="font-display text-lg font-semibold">No published properties found</h2>
            <p className="mt-2 text-sm text-stone-600">Try adjusting the filters or check back later.</p>
          </div>
        )}
      </section>
    </main>
  );
}
