import Image from 'next/image';
import Link from 'next/link';
import { Building2, CheckCircle2, CircleDollarSign, Home, Plus } from 'lucide-react';
import { Topbar } from '@/components/topbar';
import { StatusBadge } from '@/components/status-badge';
import { getCurrentAdmin } from '@/lib/queries';
import { portalPath } from '@/lib/paths';
import { createClient } from '@/lib/supabase/server';
import { formatPropertyPrice } from '@/lib/properties';
import { assignPropertyToAgent, changePropertyAvailability, changePropertyStatus, removePropertyAssignment } from './actions';
import { DeletePropertyButton } from './delete-property-button';

export const dynamic = 'force-dynamic';

const PUBLICATION_STATUSES = ['draft', 'pending_review', 'published', 'archived'];
const PROPERTY_TYPES = ['land', 'house', 'duplex', 'apartment', 'commercial', 'other'];
const AVAILABILITY_STATUSES = ['available', 'sold', 'rented', 'leased'];

export default async function AdminPropertiesPage({
  searchParams,
}: {
  searchParams: { error?: string; created?: string; updated?: string; deleted?: string; search?: string; location?: string; status?: string; type?: string; availability?: string };
}) {
  const supabase = createClient();
  const adminPromise = getCurrentAdmin();
  const countPromises = [
    supabase.from('properties').select('id', { count: 'exact', head: true }),
    supabase.from('properties').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('properties').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
    supabase.from('properties').select('id', { count: 'exact', head: true }).eq('availability_status', 'sold'),
    supabase.from('properties').select('id', { count: 'exact', head: true }).eq('availability_status', 'rented'),
  ];

  let propertiesQuery = supabase
    .from('properties')
    .select('id, slug, title, property_type, listing_type, status, availability_status, country, state, city, neighborhood, price, currency, created_at, property_images(id, storage_path, sort_order), agent_property_assignments(id, agent_id, agent:agent_id(full_name))')
    .order('created_at', { ascending: false });

  const search = (searchParams.search ?? '').trim().replace(/[^a-zA-Z0-9\s-]/g, ' ').replace(/\s+/g, ' ').slice(0, 80);
  const location = (searchParams.location ?? '').trim().replace(/[^a-zA-Z0-9\s-]/g, ' ').replace(/\s+/g, ' ').slice(0, 80);
  if (search) propertiesQuery = propertiesQuery.ilike('title', `%${search}%`);
  if (location) propertiesQuery = propertiesQuery.or(`city.ilike.%${location}%,state.ilike.%${location}%,neighborhood.ilike.%${location}%`);
  if (PUBLICATION_STATUSES.includes(searchParams.status ?? '')) propertiesQuery = propertiesQuery.eq('status', searchParams.status!);
  if (PROPERTY_TYPES.includes(searchParams.type ?? '')) propertiesQuery = propertiesQuery.eq('property_type', searchParams.type!);
  if (AVAILABILITY_STATUSES.includes(searchParams.availability ?? '')) propertiesQuery = propertiesQuery.eq('availability_status', searchParams.availability!);

  const [{ data: properties, error: propertyError }, { data: agents, error: agentError }, counts, admin] = await Promise.all([
    propertiesQuery,
    supabase.from('users').select('id, full_name, email').eq('status', 'active').order('full_name'),
    Promise.all(countPromises),
    adminPromise,
  ]);
  if (propertyError) throw propertyError;
  if (agentError) throw agentError;
  if (counts.some((result) => result.error)) throw counts.find((result) => result.error)!.error!;

  const [total, published, drafts, sold, rented] = counts.map((result) => result.count ?? 0);
  const inventory = await Promise.all((properties ?? []).map(async (property) => {
    const cover = [...(property.property_images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0];
    if (!cover) return { ...property, coverUrl: null as string | null };
    const { data } = await supabase.storage.from('property-images').createSignedUrl(cover.storage_path, 3600);
    return { ...property, coverUrl: data?.signedUrl ?? null };
  }));

  return (
    <>
      <Topbar title="Property Management" description="Create, publish, and manage property listings and images." admin={admin} />
      <main className="space-y-6 p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl text-text">Property inventory</h2>
            <p className="mt-1 text-sm text-text-muted">New listings stay private until you choose to publish them.</p>
          </div>
          <Link href={portalPath('/admin/properties/new')} className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-dark">
            <Plus size={17} /> Add New Property
          </Link>
        </div>

        {searchParams.error && <Message tone="danger">{searchParams.error}</Message>}
        {searchParams.created && <Message tone="success">Property created.</Message>}
        {searchParams.updated && <Message tone="success">Property updated.</Message>}
        {searchParams.deleted && <Message tone="success">Property and associated images deleted.</Message>}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Total properties" value={total} icon={<Building2 size={18} />} />
          <SummaryCard label="Published properties" value={published} icon={<CheckCircle2 size={18} />} accent="green" />
          <SummaryCard label="Draft properties" value={drafts} icon={<Home size={18} />} accent="amber" />
          <SummaryCard label="Sold / rented" value={sold + rented} icon={<CircleDollarSign size={18} />} accent="blue" />
        </div>

        <section className="rounded-xl border border-border bg-card p-4 shadow-card md:p-5">
          <form action={portalPath('/admin/properties')} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <label className="text-xs font-medium text-text-muted lg:col-span-2">Search title
              <input name="search" defaultValue={searchParams.search} placeholder="Search properties" className={filterClass} />
            </label>
            <label className="text-xs font-medium text-text-muted lg:col-span-2">Location
              <input name="location" defaultValue={searchParams.location} placeholder="City, state, or neighborhood" className={filterClass} />
            </label>
            <label className="text-xs font-medium text-text-muted">Publication status
              <select name="status" defaultValue={searchParams.status ?? ''} className={filterClass}>
                <option value="">All statuses</option>
                <option value="draft">Draft</option>
                <option value="pending_review">Pending review</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <label className="text-xs font-medium text-text-muted">Property type
              <select name="type" defaultValue={searchParams.type ?? ''} className={filterClass}>
                <option value="">All types</option>
                {PROPERTY_TYPES.map((type) => <option key={type} value={type}>{labelFor(type)}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-text-muted">Availability
              <select name="availability" defaultValue={searchParams.availability ?? ''} className={filterClass}>
                <option value="">All availability</option>
                {AVAILABILITY_STATUSES.map((status) => <option key={status} value={status}>{labelFor(status)}</option>)}
              </select>
            </label>
            <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-6">
              <button className="rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-dark">Apply filters</button>
              <Link href={portalPath('/admin/properties')} className="rounded-lg border border-border bg-white px-4 py-2.5 text-sm text-text-muted hover:bg-black/5">Clear</Link>
              <span className="ml-auto self-center text-xs text-text-faint">{inventory.length} {inventory.length === 1 ? 'property' : 'properties'}</span>
            </div>
          </form>
        </section>

        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="border-b border-border bg-paper/70 text-xs text-text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Property</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Publication</th>
                  <th className="px-4 py-3 font-medium">Availability</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">Assigned agents</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((property) => (
                  <tr key={property.id} className="border-b border-border last:border-0 align-top">
                    <td className="px-4 py-4">
                      <div className="flex min-w-64 items-center gap-3">
                        <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-stone-100">
                          {property.coverUrl ? <Image src={property.coverUrl} alt="" fill unoptimized sizes="80px" className="object-cover" /> : <div className="flex h-full items-center justify-center text-[10px] text-text-faint">No cover</div>}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-text">{property.title}</p>
                          <p className="mt-1 text-xs capitalize text-text-muted">{labelFor(property.listing_type)} · {labelFor(property.property_type)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-text-muted">
                      <p>{[property.neighborhood, property.city].filter(Boolean).join(', ') || '—'}</p>
                      <p className="mt-1 text-xs">{[property.state, property.country].filter(Boolean).join(', ')}</p>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-text">{formatPropertyPrice(property.price == null ? null : Number(property.price), property.currency, property.listing_type)}</td>
                    <td className="px-4 py-4"><StatusBadge status={property.status} /></td>
                    <td className="px-4 py-4"><AvailabilityBadge status={property.availability_status} /></td>
                    <td className="px-4 py-4 whitespace-nowrap text-xs text-text-muted">{new Date(property.created_at).toLocaleDateString('en-NG')}</td>
                    <td className="min-w-52 px-4 py-4">
                      <ul className="space-y-2">
                        {(property.agent_property_assignments ?? []).map((assignment) => {
                          const agent = Array.isArray(assignment.agent) ? assignment.agent[0] : assignment.agent;
                          return <li key={assignment.id} className="flex items-center justify-between gap-2 text-xs"><span>{agent?.full_name ?? 'Assigned agent'}</span><form action={removePropertyAssignment}><input type="hidden" name="assignment_id" value={assignment.id} /><button className="text-danger hover:underline">Remove</button></form></li>;
                        })}
                      </ul>
                      <form action={assignPropertyToAgent} className="mt-3 flex gap-2">
                        <input type="hidden" name="property_id" value={property.id} />
                        <select name="agent_id" required defaultValue="" aria-label={`Assign an agent to ${property.title}`} className="min-w-0 flex-1 rounded-md border border-border bg-white px-2 py-1.5 text-xs">
                          <option value="" disabled>Assign agent</option>
                          {(agents ?? []).map((agent) => <option key={agent.id} value={agent.id}>{agent.full_name}</option>)}
                        </select>
                        <button className="rounded-md border border-border px-2 py-1 text-xs hover:bg-black/5">Add</button>
                      </form>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex min-w-28 flex-col items-start gap-2">
                        <Link href={portalPath(`/admin/properties/${property.id}`)} className="text-xs font-medium text-brand hover:underline">Edit</Link>
                        <Link href={`${portalPath(`/admin/properties/${property.id}`)}#images`} className="text-xs text-brand hover:underline">Upload / manage photos</Link>
                        {property.status === 'published' ? (
                          <>
                            <Link href={`/properties/${property.slug}`} target="_blank" className="text-xs text-brand hover:underline">View ↗</Link>
                            <PropertyAction propertyId={property.id} value="draft" label="Unpublish" action={changePropertyStatus} />
                          </>
                        ) : <PropertyAction propertyId={property.id} value="published" label="Publish" action={changePropertyStatus} />}
                        {property.availability_status !== 'available' && <PropertyAction propertyId={property.id} value="available" label="Mark available" action={changePropertyAvailability} availability />}
                        {property.availability_status !== 'sold' && <PropertyAction propertyId={property.id} value="sold" label="Mark sold" action={changePropertyAvailability} availability />}
                        {property.availability_status !== 'rented' && <PropertyAction propertyId={property.id} value="rented" label="Mark rented" action={changePropertyAvailability} availability />}
                        <DeletePropertyButton propertyId={property.id} title={property.title} />
                      </div>
                    </td>
                  </tr>
                ))}
                {!inventory.length && <tr><td colSpan={8} className="px-5 py-14 text-center text-sm text-text-muted">No properties match these filters. Add a property to start your inventory.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </>
  );
}

const filterClass = 'mt-1.5 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text';

function SummaryCard({ label, value, icon, accent = 'brand' }: { label: string; value: number; icon: React.ReactNode; accent?: 'brand' | 'green' | 'amber' | 'blue' }) {
  const colors = {
    brand: 'bg-brand/10 text-brand',
    green: 'bg-success-soft text-success',
    amber: 'bg-amber-100 text-amber-800',
    blue: 'bg-blue-100 text-blue-800',
  };
  return <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-card"><div><p className="text-xs font-medium text-text-muted">{label}</p><p className="mt-1 font-display text-2xl text-text">{value.toLocaleString('en-NG')}</p></div><span className={`flex h-10 w-10 items-center justify-center rounded-lg ${colors[accent]}`}>{icon}</span></div>;
}

function AvailabilityBadge({ status }: { status: string }) {
  const tone = status === 'available' ? 'bg-success-soft text-success' : 'bg-amber-100 text-amber-800';
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${tone}`}>{labelFor(status)}</span>;
}

function PropertyAction({
  propertyId,
  value,
  label,
  action,
  availability = false,
}: {
  propertyId: string;
  value: string;
  label: string;
  action: (formData: FormData) => void | Promise<void>;
  availability?: boolean;
}) {
  return <form action={action}><input type="hidden" name="property_id" value={propertyId} /><input type="hidden" name={availability ? 'availability_status' : 'status'} value={value} /><button className="text-xs text-brand hover:underline">{label}</button></form>;
}

function Message({ children, tone }: { children: React.ReactNode; tone: 'success' | 'danger' }) {
  return <p role={tone === 'danger' ? 'alert' : 'status'} className={tone === 'danger' ? 'rounded-lg border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger' : 'rounded-lg bg-success-soft px-4 py-3 text-sm text-success'}>{children}</p>;
}

function labelFor(value: string) {
  const labels: Record<string, string> = {
    sale: 'For sale', rent: 'For rent', lease: 'For lease',
    house: 'House', duplex: 'Duplex', apartment: 'Apartment', land: 'Land', commercial: 'Commercial', other: 'Other',
    pending_review: 'Pending review', available: 'Available', sold: 'Sold', rented: 'Rented', leased: 'Leased',
  };
  return labels[value] ?? value.replaceAll('_', ' ');
}
