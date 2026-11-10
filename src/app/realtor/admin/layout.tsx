import { Sidebar } from '@/components/sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-paper md:block">
      <Sidebar />
      <div className="min-w-0 flex-1 md:ml-60">{children}</div>
    </div>
  );
}
