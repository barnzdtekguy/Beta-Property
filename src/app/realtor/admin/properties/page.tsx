import { getCurrentAdmin } from '@/lib/queries';
import { createClient } from '@/lib/supabase/server';
import { Topbar } from '@/components/topbar';
import { StatusBadge } from '@/components/status-badge';
import { assignPropertyToAgent, changePropertyStatus, createProperty, removePropertyAssignment } from './actions';

export const dynamic = 'force-dynamic';

export default async function AdminPropertiesPage({
  searchParams,
}: {
  searchParams: { error?: string; created?: string; updated?: string };
}) {
  const [admin] = await Promise.all([getCurrentAdmin()]);
  const supabase = createClient();
  const [{ data: properties, error: propertyError }, { data: agents, error: agentError }] = await Promise.all([
    supabase
      .from('properties')
      .select('id, slug, title, property_type, listing_type, status, city, price, currency, agent_property_assignments(id, agent_id, agent:agent_id(full_name))')
      .order('created_at', { ascending: false }),
    supabase.from('users').select('id, full_name, email').eq('status', 'active').order('full_name'),
  ]);
  if (propertyError) throw propertyError;
  if (agentError) throw agentError;

  const messages: Record<string, string> = {
    'check-property-fields': 'Check the property fields and try again.',
    'upload-error': 'The property was saved, but an image upload failed.',
    'save-error': 'The property could not be saved.',
  };

  return (
    <>
      <Topbar title="Properties" description="Create listings, publish approved properties, and assign agents." admin={admin} />
      <main className="space-y-6 p-6 md:p-8">
        {searchParams.error && (
          <p role="alert" className="rounded-lg border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">
            {messages[searchParams.error] ?? 'The requested property action could not be completed.'}
          </p>
        )}
        {searchParams.created && (
          <p role="status" className="rounded-lg bg-success-soft px-4 py-3 text-sm text-success">Property saved as a draft.</p>
        )}
        {searchParams.updated && (
          <p role="status" className="rounded-lg bg-success-soft px-4 py-3 text-sm text-success">Property updated.</p>
        )}

        <section className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="font-display text-lg text-text">Add a property</h2>
          <p className="mt-1 text-sm text-text-muted">New properties start as drafts and are not visible publicly until published.</p>
          <form action={createProperty} className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Property title"><input name="title" required minLength={3} maxLength={180} className={inputClass} /></Field>
            <Field label="URL slug (optional)"><input name="slug" maxLength={180} placeholder="Generated from title if blank" className={inputClass} /></Field>
            <Field label="Property type">
              <select name="property_type" required className={inputClass}>
                <option value="">Select type</option>
                {['land', 'house', 'apartment', 'commercial', 'other'].map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </Field>
            <Field label="Listing type">
              <select name="listing_type" required className={inputClass}>
                <option value="">Select listing type</option>
                {['sale', 'rent', 'lease'].map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </Field>
            <Field label="Price (optional)"><input name="price" type="number" min="0" step="0.01" className={inputClass} /></Field>
            <Field label="Currency (3-letter code)"><input name="currency" defaultValue="NGN" pattern="[A-Za-z]{3}" required className={inputClass} /></Field>
            <Field label="City"><input name="city" required minLength={2} maxLength={120} className={inputClass} /></Field>
            <Field label="State / region"><input name="state" maxLength={120} className={inputClass} /></Field>
            <Field label="Street address"><input name="address" maxLength={240} className={inputClass} /></Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Bedrooms"><input name="bedrooms" type="number" min="0" step="1" className={inputClass} /></Field>
              <Field label="Bathrooms"><input name="bathrooms" type="number" min="0" step="1" className={inputClass} /></Field>
              <Field label="Area"><input name="area" type="number" min="0" step="any" className={inputClass} /></Field>
            </div>
            <Field label="Area unit (optional)"><input name="area_unit" maxLength={30} placeholder="e.g. sqm" className={inputClass} /></Field>
            <Field label="Features (one per line)"><textarea name="features" rows={3} maxLength={2000} className={inputClass} /></Field>
            <Field label="Description"><textarea name="description" rows={5} required minLength={20} maxLength={12000} className={inputClass} /></Field>
            <Field label="Property photos (up to 10, 10 MB each)">
              <input name="images" type="file" accept="image/jpeg,image/png,image/webp" multiple className="block w-full text-sm text-text-muted file:mr-3 file:rounded-md file:border-0 file:bg-black/5 file:px-3 file:py-2" />
            </Field>
            <Field label="Photo description (alt text)">
              <input name="image_alt_text" maxLength={240} placeholder="Describe what the photos show" className={inputClass} />
            </Field>
            <div className="md:col-span-2">
              <button className="rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-dark">Save draft</button>
            </div>
          </form>
        </section>

        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
          <div className="border-b border-border px-5 py-4">
            <h2 className="font-display text-lg text-text">Property inventory</h2>
            <p className="mt-1 text-sm text-text-muted">Only published properties appear on the public website.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs text-text-muted">
                <tr>
                  <th className="px-5 py-3 font-medium">Property</th>
                  <th className="px-5 py-3 font-medium">Location</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Assigned agents</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(properties ?? []).map((property) => (
                  <tr key={property.id} className="border-b border-border last:border-0 align-top">
                    <td className="px-5 py-4">
                      <p className="font-medium text-text">{property.title}</p>
                      <p className="mt-1 text-xs capitalize text-text-muted">{property.listing_type} · {property.property_type}</p>
                    </td>
                    <td className="px-5 py-4 text-text-muted">{property.city}<br /><span className="text-xs">{property.price == null ? 'Contact for price' : `${property.currency} ${Number(property.price).toLocaleString('en-NG')}`}</span></td>
                    <td className="px-5 py-4"><StatusBadge status={property.status} /></td>
                    <td className="min-w-52 px-5 py-4">
                      <ul className="space-y-2">
                        {(property.agent_property_assignments ?? []).map((assignment) => {
                          const agent = Array.isArray(assignment.agent) ? assignment.agent[0] : assignment.agent;

                          return (
                            <li key={assignment.id} className="flex items-center justify-between gap-2 text-xs">
                              <span>{agent?.full_name ?? 'Assigned agent'}</span>
                              <form action={removePropertyAssignment}>
                                <input type="hidden" name="assignment_id" value={assignment.id} />
                                <button className="text-danger hover:underline">Remove</button>
                              </form>
                            </li>
                          );
                        })}
                      </ul>
                      <form action={assignPropertyToAgent} className="mt-3 flex gap-2">
                        <input type="hidden" name="property_id" value={property.id} />
                        <select name="agent_id" required defaultValue="" className="min-w-0 flex-1 rounded-md border border-border bg-white px-2 py-1.5 text-xs">
                          <option value="" disabled>Assign agent</option>
                          {(agents ?? []).map((agent) => <option key={agent.id} value={agent.id}>{agent.full_name}</option>)}
                        </select>
                        <button className="rounded-md border border-border px-2 py-1 text-xs hover:bg-black/5">Add</button>
                      </form>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col items-start gap-2">
                        {property.status !== 'published' && (
                          <StatusForm propertyId={property.id} status="published" label="Publish" />
                        )}
                        {property.status !== 'draft' && (
                          <StatusForm propertyId={property.id} status="draft" label="Move to draft" />
                        )}
                        {property.status !== 'archived' && (
                          <StatusForm propertyId={property.id} status="archived" label="Archive" />
                        )}
                        <a href={`/properties/${property.slug}`} target="_blank" rel="noreferrer" className="text-xs text-brand hover:underline">Preview</a>
                      </div>
                    </td>
                  </tr>
                ))}
                {!properties?.length && <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-text-muted">No properties have been added.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </>
  );
}

const inputClass = 'mt-1.5 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-text-muted">{label}{children}</label>;
}

function StatusForm({ propertyId, status, label }: { propertyId: string; status: string; label: string }) {
  return (
    <form action={changePropertyStatus}>
      <input type="hidden" name="property_id" value={propertyId} />
      <input type="hidden" name="status" value={status} />
      <button className="text-xs font-medium text-brand hover:underline">{label}</button>
    </form>
  );
}
