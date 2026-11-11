import { Topbar } from '@/components/topbar';
import { getCurrentAdmin } from '@/lib/queries';
import { createProperty } from '../actions';
import { PropertyForm } from '../property-form';

export const dynamic = 'force-dynamic';

export default async function NewPropertyPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const admin = await getCurrentAdmin();

  return (
    <>
      <Topbar title="Add new property" description="Save the listing to open its photo gallery, where you can upload and arrange up to 30 images." admin={admin} />
      <main className="p-6 md:p-8">
        {resolvedSearchParams.error && (
          <p role="alert" className="mb-5 rounded-lg border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">{resolvedSearchParams.error}</p>
        )}
        <PropertyForm action={createProperty} mode="create" />
      </main>
    </>
  );
}
