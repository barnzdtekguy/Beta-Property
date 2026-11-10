import { Topbar } from '@/components/topbar';
import { getCurrentAdmin } from '@/lib/queries';
import { createProperty } from '../actions';
import { PropertyForm } from '../property-form';

export const dynamic = 'force-dynamic';

export default async function NewPropertyPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const admin = await getCurrentAdmin();

  return (
    <>
      <Topbar title="Add new property" description="Create a draft listing, then add and arrange its photos." admin={admin} />
      <main className="p-6 md:p-8">
        {searchParams.error && (
          <p role="alert" className="mb-5 rounded-lg border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">{searchParams.error}</p>
        )}
        <PropertyForm action={createProperty} mode="create" />
      </main>
    </>
  );
}
