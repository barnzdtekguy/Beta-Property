import { portalPath } from '@/lib/paths';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Users2, Wallet, Clock, UserPlus } from 'lucide-react';
import {
  getCurrentRealtor,
  getRealtorStats,
  getRealtorDirectReferrals,
  getRealtorOverrideEarnings,
  getRealtorLeads,
  getRealtorAssignedProperties,
  getRealtorAssignedInquiries,
  getDownlineSalesActivity,
  getAnnouncements,
} from '@/lib/realtor-queries';
import { StatCard } from '@/components/stat-card';
import { StatusBadge } from '@/components/status-badge';
import { ReferralLinkCard } from '@/components/referral-link-card';
import { AnnouncementList } from '@/components/announcement-banner';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { updateAssignedInquiryStatus, addInquiryFollowUp } from './inquiries/actions';

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  land: 'land',
  house: 'a house',
  apartment: 'an apartment',
  commercial: 'a commercial property',
  other: 'a property',
};

export default async function RealtorDashboardPage() {
  const realtor = await getCurrentRealtor();
  if (!realtor) redirect(portalPath('/login'));

  const [stats, directReferrals, overrideEarnings, leads, downlineActivity, announcements, assignedProperties, assignedInquiries] =
    await Promise.all([
      getRealtorStats(realtor.id),
      getRealtorDirectReferrals(realtor.id),
      getRealtorOverrideEarnings(realtor.id),
      getRealtorLeads(realtor.id),
      getDownlineSalesActivity(realtor.id),
      getAnnouncements(5),
      getRealtorAssignedProperties(realtor.id),
      getRealtorAssignedInquiries(realtor.id),
    ]);

  return (
    <main className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-xl text-text">
            Welcome back, {realtor.full_name.split(' ')[0]}
          </h1>
          <p className="text-sm text-text-muted mt-0.5">Here&apos;s how your referrals are doing.</p>
        </div>
        <Link
          href={portalPath('/dashboard/leads')}
          className="inline-flex items-center gap-2 rounded-lg bg-brand text-white text-sm font-medium px-4 py-2.5 hover:bg-brand-dark transition"
        >
          <UserPlus size={15} strokeWidth={1.8} />
          Submit a client
        </Link>
      </div>

      {announcements.length > 0 && <AnnouncementList announcements={announcements} />}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard label="People you've referred" value={String(stats.completed_referrals)} icon={Users2} />
        <StatCard
          label="Commission earned"
          value={formatCurrency(stats.commission_earned)}
          icon={Wallet}
          accent="amber"
        />
        <StatCard
          label="Unpaid"
          value={formatCurrency(stats.commission_unpaid)}
          icon={Clock}
          accent="amber"
        />
      </div>

      <ReferralLinkCard code={realtor.referral_code} />

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="font-display text-sm text-text">Assigned properties</h2>
          <p className="mt-1 text-xs text-text-muted">Properties assigned to your account by the team.</p>
          <ul className="mt-4 divide-y divide-border">
            {assignedProperties.map((property: any) => (
              <li key={property.id} className="py-3 first:pt-0 last:pb-0">
                {property.status === 'published' ? (
                  <Link href={`/properties/${property.slug}`} className="font-medium text-text hover:text-brand">
                    {property.title}
                  </Link>
                ) : (
                  <p className="font-medium text-text">{property.title}</p>
                )}
                <p className="mt-1 text-xs capitalize text-text-muted">{property.city}{property.state ? `, ${property.state}` : ''} · {property.listing_type} · {property.status}</p>
              </li>
            ))}
            {assignedProperties.length === 0 && <li className="py-5 text-sm text-text-muted">No properties are assigned yet.</li>}
          </ul>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="font-display text-sm text-text">Assigned visitor inquiries</h2>
          <p className="mt-1 text-xs text-text-muted">Only inquiries assigned to you are shown here.</p>
          <ul className="mt-4 divide-y divide-border">
            {assignedInquiries.slice(0, 5).map((inquiry: any) => (
              <li key={inquiry.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-text">{inquiry.full_name}</p>
                    <p className="mt-1 text-xs text-text-muted">{inquiry.property?.title ?? 'General inquiry'} · {inquiry.phone}</p>
                  </div>
                  <StatusBadge status={inquiry.status} />
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-text-muted">{inquiry.request_details}</p>
                <form action={updateAssignedInquiryStatus} className="mt-3 flex gap-2">
                  <input type="hidden" name="inquiry_id" value={inquiry.id} />
                  <select name="status" defaultValue={inquiry.status} className="min-w-0 flex-1 rounded-md border border-border bg-white px-2 py-1.5 text-xs">
                    {['new', 'contacted', 'pending_transaction', 'closed', 'rejected'].map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}
                  </select>
                  <button className="rounded-md border border-border px-2 py-1 text-xs hover:bg-black/5">Update</button>
                </form>
                <form action={addInquiryFollowUp} className="mt-3 grid gap-2">
                  <input type="hidden" name="inquiry_id" value={inquiry.id} />
                  <textarea name="details" required minLength={3} maxLength={4000} rows={2} placeholder="Add a follow-up note" className="w-full rounded-md border border-border px-2.5 py-2 text-xs" />
                  <div className="flex gap-2">
                    <select name="activity_type" className="rounded-md border border-border bg-white px-2 py-1.5 text-xs">
                      <option value="note">Note</option><option value="call">Call</option><option value="email">Email</option><option value="meeting">Meeting</option>
                    </select>
                    <input type="datetime-local" name="follow_up_at" aria-label="Schedule follow-up" className="min-w-0 flex-1 rounded-md border border-border px-2 py-1.5 text-xs" />
                    <button className="rounded-md bg-ink px-3 py-1.5 text-xs font-medium text-white hover:bg-ink-soft">Save note</button>
                  </div>
                </form>
              </li>
            ))}
            {assignedInquiries.length === 0 && <li className="py-5 text-sm text-text-muted">No visitor inquiries are assigned to you.</li>}
          </ul>
        </div>
      </section>

      <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="font-display text-sm text-text">Your client sales</h2>
            <p className="text-xs text-text-muted mt-0.5">
              Clients you&apos;ve submitted directly, and the outcome once admin decides.
            </p>
          </div>
          <Link href={portalPath('/dashboard/leads')} className="text-xs text-brand hover:text-brand-dark shrink-0">
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-text-muted">
                <th className="px-5 py-3 font-medium">Client</th>
                <th className="px-5 py-3 font-medium">Submitted</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Commission</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {leads.slice(0, 5).map((lead) => (
                <tr key={lead.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 font-medium text-text">{lead.client_name}</td>
                  <td className="px-5 py-3 text-text-muted">{formatDate(lead.created_at)}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={lead.status} />
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {lead.commission_amount != null ? formatCurrency(lead.commission_amount) : '—'}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {lead.status === 'successful' && (
                      <Link
                        href={portalPath(`/dashboard/payout/${lead.id}`)}
                        className="inline-flex items-center rounded-lg bg-ink text-white text-xs font-medium px-3 py-1.5 hover:bg-ink-soft transition"
                      >
                        Apply for commission
                      </Link>
                    )}
                  </td>
                </tr>
              ))}

              {leads.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-text-muted text-sm">
                    Submit a client above to start tracking a sale.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h2 className="font-display text-sm text-text">People you&apos;ve referred</h2>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-text-muted">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Joined</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Commission</th>
                <th className="px-5 py-3 font-medium">Payout</th>
              </tr>
            </thead>
            <tbody>
              {directReferrals.map((r: any) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 font-medium text-text">
                    {r.referred_user?.full_name ?? 'Pending signup'}
                  </td>
                  <td className="px-5 py-3 text-text-muted">
                    {r.referred_user ? formatDate(r.referred_user.created_at) : '—'}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">{formatCurrency(r.commission_amount)}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={r.commission_status} />
                  </td>
                </tr>
              ))}

              {directReferrals.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-text-muted text-sm">
                    Share your link above — anyone who registers through it shows up here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {downlineActivity.length > 0 && (
        <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h2 className="font-display text-sm text-text">Your network&apos;s sales activity</h2>
          </div>
          <ul className="divide-y divide-border">
            {downlineActivity.map((a: any) => (
              <li key={a.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-text">
                    <span className="font-medium">{a.realtor?.full_name ?? 'Your referral'}</span> has
                    made a sale
                    {a.lead?.property_type ? ` — ${PROPERTY_TYPE_LABELS[a.lead.property_type] ?? ''}` : ''}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">{formatDateTime(a.created_at)}</p>
                </div>
                <StatusBadge status={a.status} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {overrideEarnings.length > 0 && (
        <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h2 className="font-display text-sm text-text">Earnings from your network</h2>
            <p className="text-xs text-text-muted mt-0.5">
              Commission from people referred by someone you brought in — not your own direct
              referrals.
            </p>
          </div>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-text-muted">
                  <th className="px-5 py-3 font-medium">Person who joined</th>
                  <th className="px-5 py-3 font-medium">Brought in by</th>
                  <th className="px-5 py-3 font-medium text-right">Commission</th>
                  <th className="px-5 py-3 font-medium">Payout</th>
                </tr>
              </thead>
              <tbody>
                {overrideEarnings.map((r: any) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3 font-medium text-text">
                      {r.referred_user?.full_name ?? '—'}
                    </td>
                    <td className="px-5 py-3 text-text-muted">
                      {r.referred_user?.referred_via?.full_name ?? '—'}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      {formatCurrency(r.commission_amount)}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={r.commission_status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
