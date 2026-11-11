import { MarketingContentManager } from '@/components/admin/marketing-content-manager';

export const dynamic = 'force-dynamic';

export default async function DevelopmentsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string; saved?: string; published?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  return <MarketingContentManager kind="developments" searchParams={resolvedSearchParams} />;
}
