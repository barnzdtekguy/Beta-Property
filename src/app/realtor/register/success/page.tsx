import { Check } from 'lucide-react';
import { Logo } from '@/components/logo';
import { portalPath } from '@/lib/paths';

export default function RegisterSuccessPage({
  searchParams,
}: {
  searchParams: { code?: string; name?: string };
}) {
  const name = searchParams.name ?? 'there';

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper p-6">
      <div className="w-full max-w-sm text-center">
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <Logo variant="icon" size={24} href="/" />
          <span className="font-display font-medium tracking-tight text-text text-sm">Beta Marketing</span>
        </div>

        <div className="mx-auto w-12 h-12 rounded-full bg-success-soft text-success flex items-center justify-center">
          <Check size={22} strokeWidth={2} />
        </div>

        <h1 className="mt-4 font-display text-xl text-text">Welcome, {name.split(' ')[0]}</h1>
        <p className="mt-1 text-sm text-text-muted">
          Your email is verified. Your account is waiting for administrator approval.
        </p>

        <a
          href={portalPath('/login')}
          className="mt-6 inline-flex items-center justify-center w-full rounded-lg bg-brand text-white text-sm font-medium py-2.5 hover:bg-brand-dark transition"
        >
          Continue to sign in
        </a>
        <p className="mt-3 text-xs text-text-faint">
          Dashboard access and your referral link become available after approval.
        </p>
      </div>
    </div>
  );
}
