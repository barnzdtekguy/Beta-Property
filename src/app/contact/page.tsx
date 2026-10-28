import Link from 'next/link';
import { submitPropertyInquiry } from '@/app/properties/actions';

export const dynamic = 'force-dynamic';

export default function ContactPage({ searchParams }: { searchParams: { inquiry?: string } }) {
  const errorMessage = searchParams.inquiry === 'invalid'
    ? 'Please check the form details and try again.'
    : searchParams.inquiry === 'unavailable'
      ? 'We could not submit your inquiry. Please try again.'
      : null;

  return (
    <main className="min-h-screen bg-white px-5 py-12 text-stone-900 md:py-20">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="font-display text-lg font-semibold">Beta Property</Link>
        <p className="mt-10 text-xs font-semibold uppercase tracking-[0.2em] text-brand">Get in touch</p>
        <h1 className="mt-3 font-display text-4xl font-semibold">Start a conversation.</h1>
        <p className="mt-3 text-sm leading-6 text-stone-600">Tell us what you’re looking for and the team will follow up using your preferred contact method.</p>
        {searchParams.inquiry === 'sent' ? (
          <p role="status" id="inquiry" className="mt-8 rounded-xl bg-success-soft p-5 text-sm text-success">Thank you. Your inquiry has been sent to our team.</p>
        ) : (
          <form id="inquiry" action={submitPropertyInquiry} className="mt-8 space-y-4 rounded-xl border border-stone-200 p-6">
            <input type="hidden" name="return_path" value="/contact" />
            <label className="block text-sm font-medium">Full name<input name="full_name" required maxLength={120} autoComplete="name" className="mt-1.5 w-full rounded-lg border border-stone-300 px-3 py-2.5" /></label>
            <label className="block text-sm font-medium">Email<input name="email" type="email" required maxLength={254} autoComplete="email" className="mt-1.5 w-full rounded-lg border border-stone-300 px-3 py-2.5" /></label>
            <label className="block text-sm font-medium">Phone<input name="phone" type="tel" required maxLength={40} autoComplete="tel" className="mt-1.5 w-full rounded-lg border border-stone-300 px-3 py-2.5" /></label>
            <label className="block text-sm font-medium">Preferred contact method<select name="preferred_contact_method" className="mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5"><option value="phone">Phone</option><option value="email">Email</option><option value="whatsapp">WhatsApp</option></select></label>
            <label className="block text-sm font-medium">How can we help?<textarea name="request_details" required minLength={5} maxLength={4000} rows={5} className="mt-1.5 w-full rounded-lg border border-stone-300 px-3 py-2.5" /></label>
            <label className="hidden" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
            {errorMessage && <p role="alert" className="text-sm text-danger">{errorMessage}</p>}
            <button className="w-full rounded-lg bg-brand px-4 py-3 text-sm font-medium text-white hover:bg-brand-dark">Send inquiry</button>
          </form>
        )}
      </div>
    </main>
  );
}
