import { MarketingContentManager } from '@/components/admin/marketing-content-manager';

export const dynamic = 'force-dynamic';

export default function DevelopmentsAdminPage({
  searchParams,
}: {
  searchParams: { error?: string; created?: string; saved?: string; published?: string };
}) {
  return <MarketingContentManager kind="developments" searchParams={searchParams} />;
}
