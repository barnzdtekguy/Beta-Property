import { formatDateTime } from '@/lib/utils';
import { getCurrentAdmin } from '@/lib/queries';
import { createClient } from '@/lib/supabase/server';
import { Topbar } from '@/components/topbar';
import { StatusBadge } from '@/components/status-badge';
import { updateInquiry } from './actions';

export const dynamic = 'force-dynamic';

export default async function AdminInquiriesPage({
  searchParams,
}: {
  searchParams: { error?: string; updated?: string };
}) {
  const admin = await getCurrentAdmin();
  const supabase = createClient();
  const [{ data: inquiries, error: inquiryError }, { data: agents, error: agentError }] = await Promise.all([
    supabase
      .from('inquiries')
      .select('id, full_name, email, phone, request_details, property_id, assigned_to, preferred_contact_method, status, created_at, property:property_id(title, slug), agent:assigned_to(full_name)')
      .order('created_at', { ascending: false }),
    supabase.from('users').select('id, full_name').eq('status', 'active').order('full_name'),
  ]);
  if (inquiryError) throw inquiryError;
  if (agentError) throw agentError;

  const errors: Record<string, string> = {
    'invalid-update': 'Choose a valid inquiry and status.',
    'agent-not-active': 'Only approved agents can be assigned.',
    'update-failed': 'The inquiry could not be updated.',
  };

  return (
    <>
      <Topbar title="Inquiries" description={`${inquiries?.length ?? 0} visitor inquiries`} admin={admin} />
      <main className="space-y-4 p-6 md:p-8">
        {searchParams.error && <p role="alert" className="rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger">{errors[searchParams.error] ?? 'The inquiry could not be updated.'}</p>}
        {searchParams.updated && <p role="status" className="rounded-lg bg-success-soft px-4 py-3 text-sm text-success">Inquiry updated.</p>}

        {(inquiries ?? []).map((inquiry) => {
          const property = Array.isArray(inquiry.property) ? inquiry.property[0] : inquiry.property;

          return (
            <article key={inquiry.id} className="rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-lg font-medium text-text">{inquiry.full_name}</h2>
                <p className="mt-1 text-sm text-text-muted">{inquiry.email} · {inquiry.phone}</p>
                <p className="mt-1 text-xs text-text-faint">{formatDateTime(inquiry.created_at)} · prefers {inquiry.preferred_contact_method ?? 'contact'}</p>
              </div>
              <StatusBadge status={inquiry.status} />
            </div>
            <p className="mt-4 whitespace-pre-line text-sm leading-6 text-text">{inquiry.request_details}</p>
            <p className="mt-3 text-sm">
              Property:{' '}
              {property?.slug ? (
                <a className="text-brand hover:underline" href={`/properties/${property.slug}`}>{property.title}</a>
              ) : <span className="text-text-muted">General inquiry</span>}
            </p>
            <form action={updateInquiry} className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <input type="hidden" name="inquiry_id" value={inquiry.id} />
              <label className="text-xs font-medium text-text-muted">
                Status
                <select name="status" defaultValue={inquiry.status} className="mt-1.5 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text">
                  {['new', 'contacted', 'pending_transaction', 'closed', 'rejected'].map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}
                </select>
              </label>
              <label className="text-xs font-medium text-text-muted">
                Assigned agent
                <select name="assigned_to" defaultValue={inquiry.assigned_to ?? ''} className="mt-1.5 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text">
                  <option value="">Unassigned</option>
                  {(agents ?? []).map((agent) => <option key={agent.id} value={agent.id}>{agent.full_name}</option>)}
                </select>
              </label>
              <button className="self-end rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white hover:bg-ink-soft">Save</button>
            </form>
            </article>
          );
        })}
        {!inquiries?.length && <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center text-sm text-text-muted">No visitor inquiries yet.</div>}
      </main>
    </>
  );
}
