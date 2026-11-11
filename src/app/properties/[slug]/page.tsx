import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowUpRight, Bath, BedDouble, CarFront, Check, MapPin, Ruler } from 'lucide-react';
import PropertySiteHeader from '@/components/property-site-header';
import { getPublishedProperty, formatPropertyPrice } from '@/lib/properties';
import { submitPropertyInquiry } from '@/app/properties/actions';
import { PublicFooter } from '@/components/public-content-shell';

export const dynamic = 'force-dynamic';

export default async function PropertyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ inquiry?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const { slug } = await params;
  const property = await getPublishedProperty(slug);
  if (!property) notFound();

  const errorMessage =
    resolvedSearchParams.inquiry === 'invalid'
      ? 'Please check the form details and try again.'
      : resolvedSearchParams.inquiry === 'unavailable'
        ? 'We could not submit your inquiry. Please try again or contact our team.'
        : null;
  const location = [property.address, property.neighborhood, property.city, property.state, property.country]
    .filter(Boolean)
    .join(', ');
  const facts = [
    property.bedrooms !== null && property.bedrooms !== undefined
      ? { label: 'Bedrooms', value: property.bedrooms, icon: BedDouble }
      : null,
    property.bathrooms !== null && property.bathrooms !== undefined
      ? { label: 'Bathrooms', value: property.bathrooms, icon: Bath }
      : null,
    property.parking_spaces !== null && property.parking_spaces !== undefined
      ? { label: 'Parking spaces', value: property.parking_spaces, icon: CarFront }
      : null,
    property.area
      ? { label: 'Property size', value: `${property.area} ${property.area_unit ?? ''}`.trim(), icon: Ruler }
      : null,
    property.land_size
      ? { label: 'Land size', value: `${property.land_size} ${property.land_size_unit ?? ''}`.trim(), icon: Ruler }
      : null,
  ].filter((fact): fact is NonNullable<typeof fact> => fact !== null);
  const details = [
    { label: 'Property type', value: property.property_type },
    { label: 'Toilets', value: property.toilets },
    { label: 'Furnishing', value: property.furnishing_status?.replaceAll('_', ' ') },
    { label: 'Condition', value: property.property_condition?.replaceAll('_', ' ') },
  ].filter((detail) => detail.value !== null && detail.value !== undefined);

  return (
    <main className="min-h-screen bg-[#f8f7f5] text-[#171719]">
      <PropertySiteHeader activePath="/properties" />
      <div className="mx-auto max-w-[1440px] px-5 pb-20 pt-7 sm:px-8 lg:px-12 lg:pt-9">
        <Link href="/properties" className="inline-flex items-center gap-2 text-xs font-semibold text-stone-500 transition hover:text-[#171719]">
          <ArrowLeft aria-hidden="true" size={15} /> All properties
        </Link>

        <div className="mb-6 mt-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#f32e37]">
              <span className="h-0.5 w-5 bg-[#f32e37]" />
              {property.listing_type.replaceAll('_', ' ')} <span className="text-stone-300">/</span> {property.property_type.replaceAll('_', ' ')}
            </p>
            <h1 className="max-w-4xl font-display text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-4xl lg:text-5xl">
              {property.title}
            </h1>
            {location && (
              <p className="mt-3 flex items-start gap-2 text-sm leading-6 text-stone-500">
                <MapPin aria-hidden="true" size={16} className="mt-1 shrink-0 text-[#f32e37]" /> {location}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2 pb-1">
            {property.negotiable && <span className="bg-emerald-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-800">Price negotiable</span>}
            {property.availability_status !== 'available' && (
              <span className="bg-amber-100 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-amber-900">
                {property.availability_status.replaceAll('_', ' ')}
              </span>
            )}
          </div>
        </div>

        <section aria-label="Property photos" className={`grid gap-2 overflow-hidden rounded-sm ${property.property_images.length > 0 ? 'md:grid-cols-[1.45fr_1fr] md:auto-rows-[230px]' : ''}`}>
          {property.property_images.length ? property.property_images.map((image, index) => (
            <div
              key={image.id}
              className={`relative min-h-[250px] overflow-hidden bg-stone-200 md:min-h-0 ${index === 0 ? 'md:row-span-2 md:min-h-[468px]' : ''}`}
            >
              <Image
                src={image.url}
                alt={image.alt_text}
                fill
                unoptimized
                priority={index === 0}
                sizes={index === 0 ? '(max-width: 768px) 100vw, 58vw' : '(max-width: 768px) 100vw, 40vw'}
                className="object-cover"
              />
            </div>
          )) : (
            <div className="flex min-h-[300px] items-center justify-center bg-stone-200 px-6 text-center text-sm text-stone-500 md:min-h-[460px]">
              Property photography coming soon
            </div>
          )}
        </section>

        <div className="mt-10 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_370px] lg:gap-16">
          <article>
            {facts.length > 0 && (
              <section aria-label="Property highlights" className="grid grid-cols-2 border-y border-stone-200 sm:grid-cols-3">
                {facts.map(({ label, value, icon: Icon }) => (
                  <div key={label} className="flex items-center gap-3 border-b border-stone-200 px-3 py-5 last:border-b-0 sm:border-b-0 sm:border-r sm:px-5 sm:first:pl-0 sm:last:border-r-0">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-[#f32e37]">
                      <Icon aria-hidden="true" size={18} />
                    </span>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.12em] text-stone-500">{label}</p>
                      <p className="mt-1 text-sm font-semibold">{value}</p>
                    </div>
                  </div>
                ))}
              </section>
            )}

            {property.description && (
              <section className="border-b border-stone-200 py-8">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#f32e37]">About this property</p>
                <h2 className="font-display text-2xl font-semibold tracking-[-0.03em]">A closer look</h2>
                <p className="mt-4 whitespace-pre-line text-sm leading-7 text-stone-600">{property.description}</p>
              </section>
            )}

            {details.length > 0 && (
              <section className="border-b border-stone-200 py-8">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#f32e37]">The details</p>
                <h2 className="font-display text-2xl font-semibold tracking-[-0.03em]">Property details</h2>
                <dl className="mt-5 grid gap-x-8 sm:grid-cols-2">
                  {details.map(({ label, value }) => (
                    <div key={label} className="flex justify-between gap-4 border-b border-stone-200 py-3 text-sm">
                      <dt className="text-stone-500">{label}</dt>
                      <dd className="text-right font-medium capitalize">{value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            {property.features.length > 0 && (
              <section className="border-b border-stone-200 py-8">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#f32e37]">What stands out</p>
                <h2 className="font-display text-2xl font-semibold tracking-[-0.03em]">Features</h2>
                <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                  {property.features.map((feature: string) => (
                    <li key={feature} className="flex items-center gap-3 text-sm text-stone-600">
                      <Check aria-hidden="true" size={16} className="shrink-0 text-[#f32e37]" /> {feature}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {property.amenities.length > 0 && (
              <section className="py-8">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#f32e37]">Comfort and convenience</p>
                <h2 className="font-display text-2xl font-semibold tracking-[-0.03em]">Amenities</h2>
                <ul className="mt-5 flex flex-wrap gap-2">
                  {property.amenities.map((amenity: string) => (
                    <li key={amenity} className="border border-stone-200 bg-white px-3 py-2 text-xs text-stone-600">{amenity}</li>
                  ))}
                </ul>
              </section>
            )}
          </article>

          <aside id="inquiry" className="border border-stone-200 bg-white p-5 shadow-[0_8px_32px_rgba(23,23,25,0.05)] sm:p-7 lg:sticky lg:top-24">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#f32e37]">Take the next step</p>
            <p className="mt-3 font-display text-2xl font-semibold leading-tight tracking-[-0.03em]">
              {formatPropertyPrice(property.price, property.currency, property.listing_type)}
            </p>
            <p className="mt-3 text-sm leading-6 text-stone-500">Ask us a question or arrange a viewing with our team.</p>
            {resolvedSearchParams.inquiry === 'sent' ? (
              <p role="status" className="mt-5 border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">
                Thank you. Your inquiry has been sent to our team.
              </p>
            ) : (
              <InquiryForm propertyId={property.id} returnPath={`/properties/${property.slug}`} errorMessage={errorMessage} />
            )}
          </aside>
        </div>
      </div>
      <PublicFooter />
    </main>
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
  const fieldClass = 'mt-1.5 w-full rounded-sm border border-stone-200 bg-white px-3 py-2.5 text-sm text-[#171719] outline-none transition focus:border-[#f32e37]';

  return (
    <form action={submitPropertyInquiry} className="mt-6 space-y-3">
      {propertyId && <input type="hidden" name="property_id" value={propertyId} />}
      <input type="hidden" name="return_path" value={returnPath} />
      <label className="block text-[11px] font-medium text-stone-600">Full name<input name="full_name" required maxLength={120} autoComplete="name" className={fieldClass} /></label>
      <label className="block text-[11px] font-medium text-stone-600">Email<input name="email" type="email" required maxLength={254} autoComplete="email" className={fieldClass} /></label>
      <label className="block text-[11px] font-medium text-stone-600">Phone<input name="phone" type="tel" required maxLength={40} autoComplete="tel" className={fieldClass} /></label>
      <label className="block text-[11px] font-medium text-stone-600">
        Preferred contact method
        <select name="preferred_contact_method" className={`${fieldClass} bg-white`}>
          <option value="phone">Phone</option>
          <option value="email">Email</option>
          <option value="whatsapp">WhatsApp</option>
        </select>
      </label>
      <label className="block text-[11px] font-medium text-stone-600">Message<textarea name="request_details" required minLength={5} maxLength={4000} rows={4} className={`${fieldClass} resize-y`} /></label>
      <label className="hidden" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      {errorMessage && <p role="alert" className="border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-800">{errorMessage}</p>}
      <button className="inline-flex w-full items-center justify-between bg-[#f32e37] px-4 py-3.5 text-xs font-semibold text-white transition hover:bg-[#d81e29]">
        Send inquiry <ArrowUpRight aria-hidden="true" size={17} />
      </button>
    </form>
  );
}
