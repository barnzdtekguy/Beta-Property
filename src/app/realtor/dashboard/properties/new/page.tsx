import { redirect } from 'next/navigation';
import { PropertyForm } from '@/app/realtor/admin/properties/property-form';
import { submitRealtorProperty } from '@/app/realtor/admin/properties/actions';
import { getCurrentRealtor } from '@/lib/realtor-queries';
import { portalPath } from '@/lib/paths';

export const dynamic = 'force-dynamic';

export default async function NewRealtorPropertyPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const realtor = await getCurrentRealtor();
  if (!realtor) redirect(portalPath('/login?error=not-authorized'));
  const params = await searchParams;

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6 md:p-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand">New listing</p>
        <h1 className="mt-2 font-display text-2xl text-text">Submit a property</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-text-muted">Add the full property information for the admin team to review. Your listing stays private until an admin approves and publishes it. You can add photos after submitting.</p>
      </header>
      {params.error && <p role="alert" className="rounded-lg border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">{params.error}</p>}
      <PropertyForm
        action={submitRealtorProperty}
        mode="create"
        agentMode
        cancelHref={portalPath('/dashboard/properties')}
      />
    </main>
  );
}
