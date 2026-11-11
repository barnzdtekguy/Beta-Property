import { PublicHeader } from '@/components/public-content-shell';

export default function PropertySiteHeader({ activePath = '/properties' }: { activePath?: string }) {
  return <PublicHeader activePath={activePath} />;
}
