import Link from 'next/link';
import { getCurrentAdmin, getUsers } from '@/lib/queries';
import { Topbar } from '@/components/topbar';
import { FiltersBar } from '@/components/filters-bar';
import { Pagination } from '@/components/pagination';
import { ExportButton } from '@/components/export-button';
import { StatusBadge } from '@/components/status-badge';
import { formatDate } from '@/lib/utils';
import { portalPath } from '@/lib/paths';
import { updateAgentStatus } from './actions';

const PAGE_SIZE = 20;

export default async function UsersPage({
  searchParams,
}: {
  searchParams: {
    search?: string;
    status?: string;
    page?: string;
    sort?: string;
    error?: string;
    updated?: string;
  };
}) {
  const page = Number(searchParams.page ?? 1) || 1;
  const search = searchParams.search ?? '';
  const status = searchParams.status ?? 'all';

  const [admin, { users, total }] = await Promise.all([
    getCurrentAdmin(),
    getUsers({ search, status, page, pageSize: PAGE_SIZE, sort: (searchParams.sort as any) ?? 'newest' }),
  ]);

  const exportQuery = new URLSearchParams({ search, status }).toString();
  const errorMessages: Record<string, string> = {
    'commission-credit-failed': 'The agent was not approved because referral commissions could not be recorded. Review the server log and retry.',
    'email-not-verified': 'Verify the agent’s email before approving their account.',
    'agent-update-failed': 'The agent status could not be updated.',
    'agent-not-found': 'That agent could not be found.',
    'invalid-agent-update': 'The requested status change is invalid.',
  };

  return (
    <>
      <Topbar
        title="Users"
        description={`${total} registered ${total === 1 ? 'user' : 'users'}`}
        admin={admin}
        actions={<ExportButton filenameBase="users" fetchUrl={portalPath(`/api/export/users?${exportQuery}`)} />}
      />

      <main className="p-6 md:p-8 space-y-4">
        {searchParams.error && (
          <p role="alert" className="rounded-lg border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">
            {errorMessages[searchParams.error] ?? 'The agent update failed.'}
          </p>
        )}
        {searchParams.updated && (
          <p role="status" className="rounded-lg border border-success/20 bg-success-soft px-4 py-3 text-sm text-success">
            Agent status updated.
          </p>
        )}
        <FiltersBar
          searchPlaceholder="Search name, email, phone, or code…"
          statusOptions={[
            { value: 'all', label: 'All statuses' },
            { value: 'active', label: 'Active' },
            { value: 'pending', label: 'Pending' },
            { value: 'inactive', label: 'Inactive' },
            { value: 'rejected', label: 'Rejected' },
            { value: 'suspended', label: 'Suspended' },
          ]}
        />

        <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-text-muted">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Phone</th>
                  <th className="px-5 py-3 font-medium">Referral code</th>
                  <th className="px-5 py-3 font-medium">Referred by</th>
                  <th className="px-5 py-3 font-medium text-right">Referrals</th>
                  <th className="px-5 py-3 font-medium">Registered</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Account access</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-border last:border-0 hover:bg-black/[0.015] transition">
                    <td className="px-5 py-3">
                      <Link href={portalPath(`/admin/users/${u.id}`)} className="font-medium text-text hover:text-brand-dark">
                        {u.full_name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-text-muted">{u.email}</td>
                    <td className="px-5 py-3 text-text-muted">{u.phone ?? '—'}</td>
                    <td className="px-5 py-3">
                      <code className="font-mono text-xs bg-black/[0.03] px-1.5 py-0.5 rounded">
                        {u.referral_code}
                      </code>
                    </td>
                    <td className="px-5 py-3 text-text-muted">{u.referred_by_name ?? '—'}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{u.stats.completed_referrals}</td>
                    <td className="px-5 py-3 text-text-muted">{formatDate(u.created_at)}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={u.status} />
                    </td>
                    <td className="px-5 py-3">
                      {u.status === 'active' ? (
                        <form action={updateAgentStatus}>
                          <input type="hidden" name="agent_id" value={u.id} />
                          <input type="hidden" name="status" value="suspended" />
                          <button className="text-xs font-medium text-danger hover:underline">
                            Suspend
                          </button>
                        </form>
                      ) : u.email_verified_at ? (
                        <div className="flex items-center gap-3">
                          <form action={updateAgentStatus}>
                            <input type="hidden" name="agent_id" value={u.id} />
                            <input type="hidden" name="status" value="active" />
                            <button className="text-xs font-medium text-brand hover:underline">
                              Approve / reactivate
                            </button>
                          </form>
                          {u.status === 'pending' && (
                            <form action={updateAgentStatus}>
                              <input type="hidden" name="agent_id" value={u.id} />
                              <input type="hidden" name="status" value="rejected" />
                              <button className="text-xs font-medium text-danger hover:underline">
                                Reject
                              </button>
                            </form>
                          )}
                        </div>
                      ) : u.status === 'pending' ? (
                        <span className="text-xs text-text-faint">Awaiting email verification</span>
                      ) : (
                        u.email_verified_at ? (
                          <form action={updateAgentStatus}>
                            <input type="hidden" name="agent_id" value={u.id} />
                            <input type="hidden" name="status" value="active" />
                            <button className="text-xs font-medium text-brand hover:underline">
                              Approve / reactivate
                            </button>
                          </form>
                        ) : (
                          <span className="text-xs text-text-faint">Email not verified</span>
                        )
                      )}
                    </td>
                  </tr>
                ))}

                {users.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-5 py-12 text-center text-text-muted text-sm">
                      No users match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination page={page} pageSize={PAGE_SIZE} total={total} />
        </div>
      </main>
    </>
  );
}
