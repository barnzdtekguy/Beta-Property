import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getPublishedProperty, formatPropertyPrice } from '@/lib/properties';
import { submitPropertyInquiry } from '@/app/properties/actions';

export const dynamic = 'force-dynamic';

export default async function PropertyDetailPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { inquiry?: string };
}) {
  const property = await getPublishedProperty(params.slug);
  if (!property) notFound();

  const errorMessage =
    searchParams.inquiry === 'invalid'
      ? 'Please check the form details and try again.'
      : searchParams.inquiry === 'unavailable'
        ? 'We could not submit your inquiry. Please try again or contact our team.'
        : null;

  return (
    <main className="min-h-screen bg-white text-stone-900">
      <header className="border-b border-stone-200">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
          <Link href="/" className="font-display text-lg font-semibold">Beta Property</Link>
          <Link href="/properties" className="text-sm text-stone-600 hover:text-stone-950">All properties</Link>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,.8fr)]">
        <article>
          <div className="grid gap-3 sm:grid-cols-2">
            {property.property_images.length ? property.property_images.map((image) => (
              <div key={image.id} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-stone-100">
                <Image src={image.url} alt={image.alt_text} fill unoptimized sizes="(max-width: 640px) 100vw, 50vw" className="object-cover" />
              </div>
            )) : (
              <div className="flex aspect-[4/3] items-center justify-center rounded-xl bg-stone-100 text-sm text-stone-500">
                Property photos are not available yet
              </div>
            )}
          </div>
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-brand">
            {property.listing_type} · {property.property_type}
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold md:text-4xl">{property.title}</h1>
          <p className="mt-2 text-stone-600">{[property.address, property.city, property.state].filter(Boolean).join(', ')}</p>
          <p className="mt-5 text-xl font-semibold">{formatPropertyPrice(property.price, property.currency, property.listing_type)}</p>
          <div className="mt-8 grid grid-cols-2 gap-4 rounded-xl border border-stone-200 p-5 text-sm sm:grid-cols-4">
            <Detail label="Bedrooms" value={property.bedrooms} />
            <Detail label="Bathrooms" value={property.bathrooms} />
            <Detail label="Area" value={property.area ? `${property.area} ${property.area_unit ?? ''}` : null} />
            <Detail label="Type" value={property.property_type} />
          </div>
          <div className="mt-8">
            <h2 className="font-display text-lg font-semibold">Property details</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-stone-700">{property.description}</p>
          </div>
          {property.features.length > 0 && (
            <div className="mt-8">
              <h2 className="font-display text-lg font-semibold">Features</h2>
              <ul className="mt-3 grid gap-2 text-sm text-stone-700 sm:grid-cols-2">
                {property.features.map((feature: string) => <li key={feature}>• {feature}</li>)}
              </ul>
            </div>
          )}
        </article>

        <aside id="inquiry" className="h-fit rounded-xl border border-stone-200 p-5 shadow-sm lg:sticky lg:top-6">
          <h2 className="font-display text-xl font-semibold">Ask about this property</h2>
          <p className="mt-2 text-sm text-stone-600">Request more information or arrange an inspection.</p>
          {searchParams.inquiry === 'sent' ? (
            <p role="status" className="mt-5 rounded-lg bg-success-soft p-3 text-sm text-success">Thank you. Your inquiry has been sent to our team.</p>
          ) : (
            <InquiryForm propertyId={property.id} returnPath={`/properties/${property.slug}`} errorMessage={errorMessage} />
          )}
        </aside>
      </div>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div>
      <p className="text-xs text-stone-500">{label}</p>
      <p className="mt-1 font-medium capitalize">{value ?? '—'}</p>
    </div>
  );
}

function InquiryForm({
  propertyId,
  returnPath,
  errorMessage,
}: {
  propertyId?: string;
  returnPath: string;
  errorMessage: string | null;
}) {
  return (
    <form action={submitPropertyInquiry} className="mt-5 space-y-3">
      {propertyId && <input type="hidden" name="property_id" value={propertyId} />}
      <input type="hidden" name="return_path" value={returnPath} />
      <label className="block text-xs font-medium text-stone-600">Full name<input name="full_name" required maxLength={120} autoComplete="name" className="mt-1.5 w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm" /></label>
      <label className="block text-xs font-medium text-stone-600">Email<input name="email" type="email" required maxLength={254} autoComplete="email" className="mt-1.5 w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm" /></label>
      <label className="block text-xs font-medium text-stone-600">Phone<input name="phone" type="tel" required maxLength={40} autoComplete="tel" className="mt-1.5 w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm" /></label>
      <label className="block text-xs font-medium text-stone-600">Preferred contact method<select name="preferred_contact_method" className="mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm"><option value="phone">Phone</option><option value="email">Email</option><option value="whatsapp">WhatsApp</option></select></label>
      <label className="block text-xs font-medium text-stone-600">Message<textarea name="request_details" required minLength={5} maxLength={4000} rows={4} className="mt-1.5 w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm" /></label>
      <label className="hidden" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      {errorMessage && <p role="alert" className="text-sm text-danger">{errorMessage}</p>}
      <button className="w-full rounded-lg bg-brand px-4 py-3 text-sm font-medium text-white hover:bg-brand-dark">Send inquiry</button>
    </form>
  );
}
