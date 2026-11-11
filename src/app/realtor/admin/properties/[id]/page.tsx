import Link from 'next/link';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { notFound } from 'next/navigation';
import { Topbar } from '@/components/topbar';
import { StatusBadge } from '@/components/status-badge';
import { getCurrentAdmin } from '@/lib/queries';
import { portalPath } from '@/lib/paths';
import { createClient } from '@/lib/supabase/server';
import { updateProperty } from '../actions';
import { ImageManager } from '../image-manager';
import { PropertyForm } from '../property-form';

export const dynamic = 'force-dynamic';

export default async function EditPropertyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; created?: string; updated?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: property, error }, admin] = await Promise.all([
    supabase
      .from('properties')
      .select('*, property_images(id, storage_path, alt_text, sort_order, created_at)')
      .eq('id', id)
      .maybeSingle(),
    getCurrentAdmin(),
  ]);
  if (error || !property) notFound();

  const { data: submitter } = property.submitted_by
    ? await supabase.from('users').select('id, full_name, email, phone').eq('id', property.submitted_by).maybeSingle()
    : { data: null };

  const images = await Promise.all(
    [...(property.property_images ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(async (image) => {
        const { data } = await supabase.storage.from('property-images').createSignedUrl(image.storage_path, 3600);
        return { ...image, url: data?.signedUrl ?? null };
      })
  );

  return (
    <>
      <Topbar title="Edit property" description={property.title} admin={admin} />
      <main className="space-y-6 p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href={portalPath('/admin/properties')} className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text"><ArrowLeft aria-hidden="true" size={16} strokeWidth={1.8} /> Property Management</Link>
          <div className="flex items-center gap-3">
            <Link href="#images" className="text-sm font-medium text-brand hover:underline">Manage property photos</Link>
            <StatusBadge status={property.status} />
            <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-medium capitalize text-text-muted">{String(property.availability_status).replace('_', ' ')}</span>
            {property.status === 'published' && <Link href={`/properties/${property.slug}`} target="_blank" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline">View public page <ArrowUpRight aria-hidden="true" size={14} strokeWidth={1.8} /></Link>}
          </div>
        </div>

        {submitter && <section className="rounded-xl border border-border bg-card p-4 shadow-card">
          <h2 className="font-display text-sm text-text">Submitted by realtor</h2>
          <p className="mt-2 text-sm font-medium text-text">{submitter.full_name}</p>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
            <a className="hover:text-brand" href={`mailto:${submitter.email}`}>{submitter.email}</a>
            {submitter.phone && <a className="hover:text-brand" href={`tel:${submitter.phone}`}>{submitter.phone}</a>}
          </div>
        </section>}

        {resolvedSearchParams.error && (
          <p role="alert" className="rounded-lg border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">{resolvedSearchParams.error}</p>
        )}
        {resolvedSearchParams.created && <p role="status" className="rounded-lg bg-success-soft px-4 py-3 text-sm text-success">Property created. Add its photos below, then publish when ready.</p>}
        {resolvedSearchParams.updated && <p role="status" className="rounded-lg bg-success-soft px-4 py-3 text-sm text-success">Property details saved.</p>}

        <PropertyForm action={updateProperty} mode="edit" property={property} />

        <section id="images" className="scroll-mt-20 rounded-xl border border-border bg-card p-5 shadow-card md:p-6">
          <div className="mb-5">
            <h2 className="font-display text-lg text-text">Property images</h2>
            <p className="mt-1 text-sm text-text-muted">Drop in multiple photos, reorder them, and set the first image as the public cover. Images stay private until this listing is published.</p>
          </div>
          <ImageManager propertyId={property.id} propertyTitle={property.title} initialImages={images} />
        </section>
      </main>
    </>
  );
}
