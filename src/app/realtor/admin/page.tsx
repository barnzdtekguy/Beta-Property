import Link from 'next/link';
import { Users, Link2, Share2, Wallet, Building2, MapPin, BookOpen, ArrowUpRight } from 'lucide-react';
import { Topbar } from '@/components/topbar';
import { StatCard } from '@/components/stat-card';
import { RegistrationsChart } from '@/components/charts/registrations-chart';
import { getCurrentAdmin, getOverviewStats, getRegistrationsOverTime } from '@/lib/queries';
import { formatCurrency, formatNumber } from '@/lib/utils';

export default async function OverviewPage() {
  const [admin, stats, series] = await Promise.all([
    getCurrentAdmin(),
    getOverviewStats(),
    getRegistrationsOverTime(30),
  ]);

  return (
    <>
      <Topbar
        title="Overview"
        description="How the referral program is trending right now"
        admin={admin}
      />

      <main className="p-6 md:p-8 space-y-6">
        <section>
          <div className="mb-3">
            <h2 className="font-display text-sm text-text">Website publishing</h2>
            <p className="mt-1 text-xs text-text-muted">Manage the property stories visitors see on Beta Property.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <PublishingLink href="/realtor/admin/properties" label="Properties" description="Create and publish listings" icon={Building2} />
            <PublishingLink href="/realtor/admin/developments" label="Developments" description="Showcase projects and locations" icon={MapPin} />
            <PublishingLink href="/realtor/admin/insights" label="Insights" description="Share articles and market guidance" icon={BookOpen} />
          </div>
        </section>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Registered users" value={formatNumber(stats.totalUsers)} icon={Users} />
          <StatCard label="Referral links generated" value={formatNumber(stats.totalLinks)} icon={Link2} />
          <StatCard
            label="Completed referrals"
            value={formatNumber(stats.completedReferrals)}
            icon={Share2}
          />
          <StatCard
            label="Commission earned"
            value={formatCurrency(stats.totalCommission)}
            icon={Wallet}
            accent="amber"
          />
        </div>

        <div className="bg-card border border-border rounded-xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-display text-sm text-text">Registrations, last 30 days</h2>
          </div>
          <RegistrationsChart data={series} />
        </div>
      </main>
    </>
  );
}

function PublishingLink({ href, label, description, icon: Icon }: {
  href: string;
  label: string;
  description: string;
  icon: typeof Building2;
}) {
  return (
    <Link href={href} className="group flex min-w-0 items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-card transition hover:border-brand/40 hover:shadow-md">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand"><Icon size={19} /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-text">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-text-muted">{description}</span>
      </span>
      <ArrowUpRight size={16} className="shrink-0 text-text-faint transition group-hover:text-brand" />
    </Link>
  );
}
