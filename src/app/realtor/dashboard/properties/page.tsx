import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Plus } from 'lucide-react';
import { redirect } from 'next/navigation';
import { StatusBadge } from '@/components/status-badge';
import { formatPropertyPrice } from '@/lib/properties';
import { getCurrentRealtor } from '@/lib/realtor-queries';
import { portalPath } from '@/lib/paths';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function RealtorPropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string; updated?: string; error?: string }>;
}) {
  const realtor = await getCurrentRealtor();
  if (!realtor) redirect(portalPath('/login?error=not-authorized'));
  const params = await searchParams;
  const supabase = await createClient();
  const [{ data, error }, { data: notifications, error: notificationError }] = await Promise.all([
    supabase
      .from('properties')
      .select('id, slug, title, status, property_type, listing_type, price, currency, city, state, created_at, property_images(storage_path, sort_order)')
      .eq('submitted_by', realtor.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('notifications')
      .select('id, title, body, href, created_at')
      .eq('user_id', realtor.id)
      .order('created_at', { ascending: false })
      .limit(5),
  ]);
  if (error) throw error;
  if (notificationError) throw notificationError;

  const properties = await Promise.all((data ?? []).map(async (property) => {
    const cover = [...(property.property_images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0];
    if (!cover) return { ...property, coverUrl: null as string | null };
    const { data: signed } = await supabase.storage.from('property-images').createSignedUrl(cover.storage_path, 3600);
    return { ...property, coverUrl: signed?.signedUrl ?? null };
  }));

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6 md:p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand">Listing workspace</p>
          <h1 className="mt-2 font-display text-2xl text-text">My properties</h1>
          <p className="mt-1 text-sm text-text-muted">Track reviews and see which listings are live on the public website.</p>
        </div>
        <Link href={portalPath('/dashboard/properties/new')} className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-dark">
          <Plus size={16} /> Submit a property
        </Link>
      </header>

      {params.error && <p role="alert" className="rounded-lg border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">{params.error}</p>}
      {params.submitted && <p role="status" className="rounded-lg bg-success-soft px-4 py-3 text-sm text-success">Your property was sent to the admin team for review. You can add photos or update details while it is under review.</p>}
      {params.updated && <p role="status" className="rounded-lg bg-success-soft px-4 py-3 text-sm text-success">Your property details have been saved.</p>}

      {!!notifications?.length && <section aria-label="Property updates" className="space-y-2">
        {notifications.map((notification) => (
          <div key={notification.id} className="rounded-lg border border-success/20 bg-success-soft px-4 py-3">
            <p className="text-sm font-semibold text-success">{notification.title}</p>
            <p className="mt-1 text-sm text-success/90">{notification.body}</p>
            {notification.href?.startsWith('/properties/') && <Link href={notification.href} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-success underline">View published property <ArrowUpRight aria-hidden="true" size={14} /></Link>}
          </div>
        ))}
      </section>}

      {properties.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {properties.map((property) => (
            <article key={property.id} className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
              <div className="relative aspect-[16/9] bg-paper">
                {property.coverUrl && <Image src={property.coverUrl} alt={`Cover photo for ${property.title}`} fill unoptimized sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />}
                {!property.coverUrl && <div className="grid h-full place-items-center text-sm text-text-faint">No property photos yet</div>}
              </div>
              <div className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg text-text">{property.title}</h2>
                    <p className="mt-1 text-xs capitalize text-text-muted">{property.city}{property.state ? `, ${property.state}` : ''} · {property.property_type} · {property.listing_type}</p>
                  </div>
                  <StatusBadge status={property.status} />
                </div>
                <p className="text-sm font-semibold text-text">{formatPropertyPrice(property.price, property.currency, property.listing_type)}</p>
                {property.status === 'published' ? (
                  <p className="rounded-lg bg-success-soft px-3 py-2 text-sm text-success">Approved and published. This property is now visible to the public.</p>
                ) : property.status === 'pending_review' ? (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Waiting for the admin team to review and publish it.</p>
                ) : <p className="rounded-lg bg-paper px-3 py-2 text-sm text-text-muted">This listing is currently {property.status.replaceAll('_', ' ')}.</p>}
                <div className="flex flex-wrap gap-4 border-t border-border pt-3">
                  <Link href={portalPath(`/dashboard/properties/${property.id}`)} className="text-sm font-medium text-brand hover:underline">View details</Link>
                  {property.status === 'published' && <Link href={`/properties/${property.slug}`} className="inline-flex items-center gap-1 text-sm font-medium text-text hover:text-brand">View public listing <ArrowUpRight aria-hidden="true" size={14} /></Link>}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <section className="rounded-xl border border-dashed border-border bg-card px-6 py-14 text-center">
          <h2 className="font-display text-lg text-text">No properties submitted yet</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-text-muted">Add the complete property information and send it to the admin team. It will only appear publicly after they approve and publish it.</p>
          <Link href={portalPath('/dashboard/properties/new')} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-dark"><Plus size={16} /> Submit a property</Link>
        </section>
      )}
    </main>
  );
}
