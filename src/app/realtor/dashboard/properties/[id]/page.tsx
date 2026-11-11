import Link from 'next/link';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { notFound, redirect } from 'next/navigation';
import { PropertyForm } from '@/app/realtor/admin/properties/property-form';
import { updateRealtorProperty } from '@/app/realtor/admin/properties/actions';
import { ImageManager } from '@/app/realtor/admin/properties/image-manager';
import { StatusBadge } from '@/components/status-badge';
import { getCurrentRealtor } from '@/lib/realtor-queries';
import { portalPath } from '@/lib/paths';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function RealtorPropertyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; submitted?: string; updated?: string }>;
}) {
  const realtor = await getCurrentRealtor();
  if (!realtor) redirect(portalPath('/login?error=not-authorized'));
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const { data: property, error } = await supabase
    .from('properties')
    .select('*, property_images(id, storage_path, alt_text, sort_order, created_at)')
    .eq('id', id)
    .eq('submitted_by', realtor.id)
    .maybeSingle();
  if (error || !property) notFound();

  const images = await Promise.all(
    [...(property.property_images ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(async (image) => {
        const { data } = await supabase.storage.from('property-images').createSignedUrl(image.storage_path, 3600);
        return { ...image, url: data?.signedUrl ?? null };
      })
  );
  const canEdit = property.status === 'pending_review';

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6 md:p-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href={portalPath('/dashboard/properties')} className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text"><ArrowLeft aria-hidden="true" size={15} /> My properties</Link>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl text-text">{property.title}</h1>
            <StatusBadge status={property.status} />
          </div>
          <p className="mt-1 text-sm capitalize text-text-muted">{property.city}{property.state ? `, ${property.state}` : ''} · {property.listing_type} · submitted {new Date(property.created_at).toLocaleDateString()}</p>
        </div>
        {property.status === 'published' && (
          <Link href={`/properties/${property.slug}`} className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-dark">
            View public listing <ArrowUpRight aria-hidden="true" size={15} />
          </Link>
        )}
      </header>

      {query.error && <p role="alert" className="rounded-lg border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">{query.error}</p>}
      {query.submitted && <p role="status" className="rounded-lg bg-success-soft px-4 py-3 text-sm text-success">Your property was submitted for admin review. It is not public yet. Add photos below if you have not already.</p>}
      {query.updated && <p role="status" className="rounded-lg bg-success-soft px-4 py-3 text-sm text-success">Your property details have been saved for admin review.</p>}
      {property.status === 'published' && <p role="status" className="rounded-lg bg-success-soft px-4 py-3 text-sm text-success">Approved and published. Your property is live on the public website.</p>}
      {property.status === 'pending_review' && <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">Waiting for admin review. You can continue updating the listing while it is pending.</p>}
      {!canEdit && property.status !== 'published' && <p className="rounded-lg bg-paper px-4 py-3 text-sm text-text-muted">This property is {property.status.replaceAll('_', ' ')}. Contact the admin team if you need a change.</p>}

      <PropertyForm
        action={updateRealtorProperty}
        mode="edit"
        property={property}
        agentMode
        readOnly={!canEdit}
        cancelHref={portalPath('/dashboard/properties')}
      />

      <section id="images" className="scroll-mt-20 rounded-xl border border-border bg-card p-5 shadow-card md:p-6">
        <div className="mb-5">
          <h2 className="font-display text-lg text-text">Property images</h2>
          <p className="mt-1 text-sm text-text-muted">{canEdit ? 'Add, reorder, and describe up to 30 photos. The first photo becomes the public cover when an admin publishes the listing.' : 'Property photos shown on this listing.'}</p>
        </div>
        <ImageManager propertyId={property.id} propertyTitle={property.title} initialImages={images} readOnly={!canEdit} />
      </section>
    </main>
  );
}
