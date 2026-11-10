import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import { Topbar } from '@/components/topbar';
import { StatusBadge } from '@/components/status-badge';
import { getCurrentAdmin } from '@/lib/queries';
import { createClient } from '@/lib/supabase/server';
import { isMissingDevelopmentTableError, type MarketingContentKind } from '@/lib/marketing-content';
import { changeMarketingContentStatus, saveMarketingContent } from '@/app/realtor/admin/content-actions';
import { DevelopmentContentForm } from '@/components/admin/development-content-form';

const inputClass = 'mt-1.5 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text';

type MarketingContentManagerProps = {
  kind: MarketingContentKind;
  searchParams: { error?: string; created?: string; saved?: string; published?: string };
};

export async function MarketingContentManager({ kind, searchParams }: MarketingContentManagerProps) {
  const isDevelopment = kind === 'developments';
  const title = isDevelopment ? 'Developments' : 'Insights';
  const description = isDevelopment
    ? 'Showcase projects and property developments to prospective buyers.'
    : 'Publish useful real estate guidance, market updates, and company news.';
  const publicPath = `/${kind}`;
  const supabase = createClient();
  const [{ data: entries, error }, admin] = await Promise.all([
    supabase.from(kind).select('*').order('created_at', { ascending: false }),
    getCurrentAdmin(),
  ]);
  const developmentTableMissing = isDevelopment && isMissingDevelopmentTableError(error);
  if (error && !developmentTableMissing) throw error;
  const contentEntries = await Promise.all((developmentTableMissing ? [] : entries ?? []).map(async (entry: any) => {
    if (!isDevelopment || !entry.cover_image_path) return entry;
    const { data } = await supabase.storage.from('development-images').createSignedUrl(entry.cover_image_path, 3600);
    return { ...entry, cover_image_url: data?.signedUrl ?? null };
  }));

  const messages: Record<string, string> = {
    'check-fields': 'Check the title, summary, content, and any category or location fields.',
    'slug-taken': 'That URL slug is already in use. Choose a different one.',
    'save-failed': isDevelopment
      ? 'The development could not be saved. Check that migration 008 has been applied in Supabase.'
      : 'The insight could not be saved.',
    'status-failed': 'The publishing status could not be updated.',
    'image-storage-not-ready': 'Development image storage is not ready. Apply migration 010 in Supabase before uploading a cover image.',
  };

  return (
    <>
      <Topbar title={title} description={description} admin={admin} />
      <main className="space-y-6 p-4 sm:p-6 md:p-8">
        {developmentTableMissing && (
          <p role="alert" className="rounded-lg border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">
            Development storage is not set up in Supabase yet. Apply migration 008 to create the table and migration 010 to enable cover images.
          </p>
        )}
        {searchParams.error && (
          <p role="alert" className="rounded-lg border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">
            {messages[searchParams.error] ?? 'The requested content action could not be completed.'}
          </p>
        )}
        {searchParams.published && (
          <p role="status" className="rounded-lg bg-success-soft px-4 py-3 text-sm text-success">
            Published on the public website.
          </p>
        )}
        {(searchParams.created || searchParams.saved) && (
          <p role="status" className="rounded-lg bg-success-soft px-4 py-3 text-sm text-success">
            Changes saved. Drafts stay private until published.
          </p>
        )}

        <section className="rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-display text-lg text-text">Create a {isDevelopment ? 'development' : 'new insight'}</h2>
            <p className="mt-1 text-sm text-text-muted">Publish it to show it on the public website, or save it as a private draft.</p>
            </div>
            <Link href={publicPath} target="_blank" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline">View public page <ArrowUpRight aria-hidden="true" size={14} strokeWidth={1.8} /></Link>
          </div>

          {isDevelopment ? <DevelopmentContentForm /> : (
            <form action={saveMarketingContent} className="mt-5 grid gap-4 md:grid-cols-2">
              <input type="hidden" name="content_type" value={kind} />
              <Field label="Title"><input name="title" required minLength={3} maxLength={180} className={inputClass} /></Field>
              <Field label="URL slug (optional)"><input name="slug" maxLength={180} placeholder="Generated from the title" className={inputClass} /></Field>
              <Field label="Category"><input name="category" required minLength={2} maxLength={80} defaultValue="Insights" className={inputClass} /></Field>
              <div className="md:col-span-2">
                <Field label="Short summary"><textarea name="excerpt" required minLength={10} maxLength={500} rows={2} className={inputClass} placeholder="A concise introduction shown on the public listing page." /></Field>
              </div>
              <div className="md:col-span-2">
                <Field label="Article content"><textarea name="content" required minLength={30} maxLength={30000} rows={8} className={inputClass} placeholder="Write the full story. Separate paragraphs with a blank line." /></Field>
              </div>
              <div className="md:col-span-2">
                <div className="flex flex-wrap gap-2">
                  <button name="intent" value="publish" className="w-full rounded-lg bg-brand px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-dark sm:w-auto">Publish to website</button>
                  <button name="intent" value="draft" className="w-full rounded-lg border border-border bg-white px-5 py-3 text-sm font-medium text-text transition hover:bg-black/5 sm:w-auto">Save as draft</button>
                </div>
              </div>
            </form>
          )}
        </section>

        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
          <div className="border-b border-border px-5 py-4">
            <h2 className="font-display text-lg text-text">{isDevelopment ? 'Development' : 'Insight'} library</h2>
            <p className="mt-1 text-sm text-text-muted">Published entries appear on the public website. Drafts and archived entries remain private.</p>
          </div>
          <div className="divide-y divide-border">
            {contentEntries.map((entry: any) => (
              <article key={entry.id} className="p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 gap-4">
                    {isDevelopment && (
                      <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-stone-100">
                        {entry.cover_image_url ? <Image src={entry.cover_image_url} alt="" fill unoptimized sizes="112px" className="object-cover" /> : <span className="flex h-full items-center justify-center px-2 text-center text-[10px] text-text-muted">No cover image</span>}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium text-text">{entry.title}</h3>
                        <StatusBadge status={entry.status} />
                      </div>
                      <p className="mt-1 break-all text-xs text-text-muted">/{kind}/{entry.slug}</p>
                      <p className="mt-2 max-w-3xl text-sm text-text-muted">{entry.excerpt}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-3 text-sm">
                    {entry.status === 'published' && <Link href={`${publicPath}/${entry.slug}`} target="_blank" className="inline-flex items-center gap-1 font-medium text-brand hover:underline">Preview <ArrowUpRight aria-hidden="true" size={14} strokeWidth={1.8} /></Link>}
                    <details className="relative">
                      <summary className="cursor-pointer font-medium text-brand hover:underline">Edit</summary>
                      {isDevelopment ? (
                        <div className="mt-3 min-w-0 rounded-lg border border-border bg-paper p-4 sm:absolute sm:right-0 sm:z-10 sm:w-[min(38rem,calc(100vw-2rem))] sm:shadow-xl">
                          <DevelopmentContentForm entry={entry} />
                        </div>
                      ) : (
                        <form action={saveMarketingContent} className="mt-3 grid min-w-0 gap-3 rounded-lg border border-border bg-paper p-4 sm:absolute sm:right-0 sm:z-10 sm:w-[min(38rem,calc(100vw-2rem))] sm:shadow-xl">
                          <input type="hidden" name="content_type" value={kind} />
                          <input type="hidden" name="id" value={entry.id} />
                          <Field label="Title"><input name="title" required minLength={3} maxLength={180} defaultValue={entry.title} className={inputClass} /></Field>
                          <Field label="URL slug"><input name="slug" required maxLength={180} defaultValue={entry.slug} className={inputClass} /></Field>
                          <Field label="Category"><input name="category" required minLength={2} maxLength={80} defaultValue={entry.category ?? 'Insights'} className={inputClass} /></Field>
                          <Field label="Short summary"><textarea name="excerpt" required minLength={10} maxLength={500} rows={3} defaultValue={entry.excerpt} className={inputClass} /></Field>
                          <Field label="Article content"><textarea name="content" required minLength={30} maxLength={30000} rows={8} defaultValue={entry.content} className={inputClass} /></Field>
                          <div className="flex flex-wrap gap-2">
                            <button name="intent" value="save" className="rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-medium text-text hover:bg-black/5">Save changes</button>
                            {entry.status !== 'published' && <button name="intent" value="publish" className="rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-dark">Save and publish</button>}
                          </div>
                        </form>
                      )}
                    </details>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {entry.status !== 'published' && <StatusForm kind={kind} id={entry.id} status="published" label="Publish" />}
                  {entry.status !== 'draft' && <StatusForm kind={kind} id={entry.id} status="draft" label="Move to draft" />}
                  {entry.status !== 'archived' && <StatusForm kind={kind} id={entry.id} status="archived" label="Archive" />}
                </div>
              </article>
            ))}
            {!entries?.length && <p className="px-5 py-12 text-center text-sm text-text-muted">Nothing has been created yet. Start with the form above.</p>}
          </div>
        </section>
      </main>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-text-muted">{label}{children}</label>;
}

function StatusForm({ kind, id, status, label }: { kind: MarketingContentKind; id: string; status: string; label: string }) {
  return (
    <form action={changeMarketingContentStatus}>
      <input type="hidden" name="content_type" value={kind} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-muted hover:border-brand hover:text-brand">{label}</button>
    </form>
  );
}
