import Link from 'next/link';
import { portalPath } from '@/lib/paths';

type PropertyFormValue = {
  id?: string;
  title?: string;
  slug?: string;
  description?: string;
  property_type?: string;
  listing_type?: string;
  price?: number | string | null;
  currency?: string;
  negotiable?: boolean;
  country?: string;
  state?: string | null;
  city?: string;
  neighborhood?: string | null;
  address?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  toilets?: number | null;
  parking_spaces?: number | null;
  area?: number | null;
  area_unit?: string | null;
  land_size?: number | null;
  land_size_unit?: string | null;
  furnishing_status?: string | null;
  property_condition?: string | null;
  amenities?: string[] | null;
  features?: string[] | null;
  status?: string;
};

type PropertyFormAction = (formData: FormData) => void | Promise<void>;

const AMENITIES = [
  'Swimming Pool', 'Gym', 'Security', 'CCTV', 'Generator', '24/7 Electricity',
  'Water Supply', 'Garden', 'Balcony', 'Fitted Kitchen', 'Air Conditioning', 'Parking Space',
];

const inputClass = 'mt-1.5 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text outline-none transition focus:border-brand focus:ring-1 focus:ring-brand';
const labelClass = 'block text-xs font-medium text-text-muted';

export function PropertyForm({
  action,
  property,
  mode,
}: {
  action: PropertyFormAction;
  property?: PropertyFormValue;
  mode: 'create' | 'edit';
}) {
  const amenities = new Set(property?.amenities ?? []);

  return (
    <form action={action} className="space-y-5">
      {property?.id && <input type="hidden" name="property_id" value={property.id} />}

      <section className="rounded-xl border border-border bg-card p-5 shadow-card md:p-6">
        <SectionTitle title="A. Property information" description="Give the listing a clear name and describe what makes it useful." />
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Property title" required>
            <input name="title" required minLength={3} maxLength={180} defaultValue={property?.title ?? ''} className={inputClass} placeholder="e.g. Four bedroom duplex in Lekki" />
          </Field>
          <Field label="Property URL slug" hint="Leave blank to generate it from the title.">
            <input name="slug" maxLength={180} defaultValue={property?.slug ?? ''} className={inputClass} placeholder="four-bedroom-duplex-lekki" />
          </Field>
          <Field label="Property type" required>
            <select name="property_type" required defaultValue={property?.property_type ?? ''} className={inputClass}>
              <option value="" disabled>Select type</option>
              <option value="house">House</option>
              <option value="duplex">Duplex</option>
              <option value="apartment">Apartment</option>
              <option value="land">Land</option>
              <option value="commercial">Commercial property</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Listing purpose" required>
            <select name="listing_type" required defaultValue={property?.listing_type ?? ''} className={inputClass}>
              <option value="" disabled>Select purpose</option>
              <option value="sale">For sale</option>
              <option value="rent">For rent</option>
              <option value="lease">For lease</option>
            </select>
          </Field>
          <div className="md:col-span-2">
            <Field label="Property description" required hint="At least 20 characters.">
              <textarea name="description" required minLength={20} maxLength={12000} rows={6} defaultValue={property?.description ?? ''} className={inputClass} placeholder="Describe the property, its layout, and the details buyers or tenants should know." />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label="Additional features" hint="Optional. Add one detail per line.">
              <textarea name="features" rows={3} maxLength={2000} defaultValue={(property?.features ?? []).join('\n')} className={inputClass} placeholder={'Gated estate\nPaved access road'} />
            </Field>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-card md:p-6">
        <SectionTitle title="B. Property location" description="Location details help people find the listing." />
        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Field label="Country" required><input name="country" required maxLength={80} defaultValue={property?.country ?? 'Nigeria'} className={inputClass} /></Field>
          <Field label="State / region"><input name="state" maxLength={120} defaultValue={property?.state ?? ''} className={inputClass} placeholder="e.g. Lagos State" /></Field>
          <Field label="City" required><input name="city" required minLength={2} maxLength={120} defaultValue={property?.city ?? ''} className={inputClass} placeholder="e.g. Lagos" /></Field>
          <Field label="Area / neighborhood"><input name="neighborhood" maxLength={120} defaultValue={property?.neighborhood ?? ''} className={inputClass} placeholder="e.g. Lekki Phase 1" /></Field>
          <div className="md:col-span-2">
            <Field label="Full address"><input name="address" maxLength={500} defaultValue={property?.address ?? ''} className={inputClass} placeholder="Street, estate, or landmark" /></Field>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-card md:p-6">
        <SectionTitle title="C. Pricing" description="Set the asking price and whether it is open to negotiation." />
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Property price" hint="Leave blank to show “Contact us for pricing”.">
            <input name="price" type="number" min="0" step="0.01" defaultValue={property?.price ?? ''} className={inputClass} placeholder="0" />
          </Field>
          <Field label="Currency" required>
            <select name="currency" required defaultValue={property?.currency ?? 'NGN'} className={inputClass}>
              <option value="NGN">NGN — Nigerian naira</option>
              <option value="USD">USD — US dollar</option>
              <option value="GBP">GBP — British pound</option>
            </select>
          </Field>
          <label className="flex items-center gap-2 self-end rounded-lg border border-border px-3 py-3 text-sm text-text">
            <input type="checkbox" name="negotiable" defaultChecked={property?.negotiable ?? false} className="h-4 w-4 accent-brand" />
            Price is negotiable
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-card md:p-6">
        <SectionTitle title="D. Property features" description="Add the practical details that matter to buyers and tenants." />
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Bedrooms"><input name="bedrooms" type="number" min="0" step="1" defaultValue={property?.bedrooms ?? ''} className={inputClass} /></Field>
          <Field label="Bathrooms"><input name="bathrooms" type="number" min="0" step="1" defaultValue={property?.bathrooms ?? ''} className={inputClass} /></Field>
          <Field label="Toilets"><input name="toilets" type="number" min="0" step="1" defaultValue={property?.toilets ?? ''} className={inputClass} /></Field>
          <Field label="Parking spaces"><input name="parking_spaces" type="number" min="0" step="1" defaultValue={property?.parking_spaces ?? ''} className={inputClass} /></Field>
          <Field label="Property size"><input name="area" type="number" min="0" step="any" defaultValue={property?.area ?? ''} className={inputClass} /></Field>
          <Field label="Property size unit"><input name="area_unit" maxLength={30} defaultValue={property?.area_unit ?? ''} className={inputClass} placeholder="e.g. sqm" /></Field>
          <Field label="Land size"><input name="land_size" type="number" min="0" step="any" defaultValue={property?.land_size ?? ''} className={inputClass} /></Field>
          <Field label="Land size unit"><input name="land_size_unit" maxLength={30} defaultValue={property?.land_size_unit ?? ''} className={inputClass} placeholder="e.g. acres, plots, sqm" /></Field>
          <Field label="Furnishing status">
            <select name="furnishing_status" defaultValue={property?.furnishing_status ?? ''} className={inputClass}>
              <option value="">Not specified</option>
              <option value="unfurnished">Unfurnished</option>
              <option value="partly_furnished">Partly furnished</option>
              <option value="furnished">Furnished</option>
            </select>
          </Field>
          <Field label="Property condition">
            <select name="property_condition" defaultValue={property?.property_condition ?? ''} className={inputClass}>
              <option value="">Not specified</option>
              <option value="new">New</option>
              <option value="excellent">Excellent</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="needs_renovation">Needs renovation</option>
              <option value="under_construction">Under construction</option>
            </select>
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-card md:p-6">
        <SectionTitle title="E. Amenities" description="Select every amenity available at the property." />
        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {AMENITIES.map((amenity) => (
            <label key={amenity} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm text-text">
              <input type="checkbox" name="amenities" value={amenity} defaultChecked={amenities.has(amenity)} className="h-4 w-4 accent-brand" />
              {amenity}
            </label>
          ))}
        </div>
      </section>

      <div className="sticky bottom-0 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-paper/95 px-6 py-4 backdrop-blur">
        <Link href={portalPath('/admin/properties')} className="text-sm text-text-muted hover:text-text">Cancel</Link>
        <div className="flex flex-wrap gap-2">
          {mode === 'edit' && <button name="intent" value="save" className="rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-medium text-text hover:bg-black/5">Save changes</button>}
          <button name="intent" value="draft" className="rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-medium text-text hover:bg-black/5">{mode === 'edit' && property?.status === 'published' ? 'Unpublish / save draft' : 'Save as draft'}</button>
          <button name="intent" value="publish" className="rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-dark">{mode === 'create' ? 'Publish property' : 'Publish property'}</button>
        </div>
      </div>
    </form>
  );
}

function SectionTitle({ title, description }: { title: string; description: string }) {
  return <div><h2 className="font-display text-lg text-text">{title}</h2><p className="mt-1 text-sm text-text-muted">{description}</p></div>;
}

function Field({ label, children, required, hint }: { label: string; children: React.ReactNode; required?: boolean; hint?: string }) {
  return (
    <label className={labelClass}>
      {label}{required && <span className="ml-1 text-danger" aria-hidden="true">*</span>}
      {children}
      {hint && <span className="mt-1 block text-[11px] font-normal text-text-faint">{hint}</span>}
    </label>
  );
}
