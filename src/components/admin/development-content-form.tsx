'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { saveMarketingContent } from '@/app/realtor/admin/content-actions';

type DevelopmentEntry = {
  id?: string;
  title?: string;
  slug?: string;
  location?: string | null;
  excerpt?: string;
  content?: string;
  status?: string;
  cover_image_path?: string | null;
  cover_image_url?: string | null;
};

const inputClass = 'mt-1.5 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-text';
const extensions: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const maxFileSize = 10 * 1024 * 1024;

export function DevelopmentContentForm({ entry }: { entry?: DevelopmentEntry }) {
  const [coverPath, setCoverPath] = useState(entry?.cover_image_path ?? '');
  const [previewUrl, setPreviewUrl] = useState(entry?.cover_image_url ?? '');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const editing = Boolean(entry?.id);
  const alreadyPublished = entry?.status === 'published';

  async function uploadCover(file?: File) {
    setError('');
    setNotice('');
    if (!file) return;

    const extension = extensions[file.type];
    if (!extension) {
      setError('Choose a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > maxFileSize) {
      setError('The image must be 10 MB or smaller.');
      return;
    }

    setUploading(true);
    try {
      const path = `developments/${entry?.id ?? crypto.randomUUID()}/${crypto.randomUUID()}.${extension}`;
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from('development-images')
        .upload(path, file, { contentType: file.type, cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;

      const { data: signedImage } = await supabase.storage.from('development-images').createSignedUrl(path, 3600);
      setCoverPath(path);
      setPreviewUrl(signedImage?.signedUrl ?? '');
      setNotice('Cover image uploaded. Save the development to apply it.');
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : 'Image upload failed.';
      setError(`${message} Check that migration 010 has been applied.`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={saveMarketingContent} className="mt-5 grid gap-4 md:grid-cols-2">
      <input type="hidden" name="content_type" value="developments" />
      {entry?.id && <input type="hidden" name="id" value={entry.id} />}
      <input type="hidden" name="cover_image_path" value={coverPath} />

      <Field label="Title"><input name="title" required minLength={3} maxLength={180} defaultValue={entry?.title ?? ''} className={inputClass} /></Field>
      <Field label={editing ? 'URL slug' : 'URL slug (optional)'}>
        <input name="slug" required={editing} maxLength={180} defaultValue={entry?.slug ?? ''} placeholder={editing ? undefined : 'Generated from the title'} className={inputClass} />
      </Field>
      <Field label="Location (optional)"><input name="location" maxLength={160} defaultValue={entry?.location ?? ''} placeholder="e.g. Abuja, Nigeria" className={inputClass} /></Field>

      <div className="md:col-span-2">
        <Field label="Short summary"><textarea name="excerpt" required minLength={10} maxLength={500} rows={3} defaultValue={entry?.excerpt ?? ''} placeholder="A concise introduction shown on the public listing page." className={inputClass} /></Field>
      </div>
      <div className="md:col-span-2">
        <Field label="Development details"><textarea name="content" required minLength={30} maxLength={30000} rows={8} defaultValue={entry?.content ?? ''} placeholder="Write the full story. Separate paragraphs with a blank line." className={inputClass} /></Field>
      </div>

      <div className="md:col-span-2">
        <div className="rounded-xl border border-border bg-white p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg bg-stone-100 sm:w-56 sm:shrink-0">
              {previewUrl ? (
                <Image src={previewUrl} alt={entry?.title ? `${entry.title} cover image` : 'Development cover preview'} fill unoptimized sizes="224px" className="object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center px-4 text-center text-xs text-text-muted">
                  {uploading ? 'Uploading cover image...' : coverPath ? 'Image uploaded; preview will appear after saving.' : 'No cover image selected'}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-text">Development cover image</p>
              <p className="mt-1 text-xs leading-5 text-text-muted">JPEG, PNG, or WebP up to 10 MB. This image appears on the public developments page.</p>
              <input
                ref={fileInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  event.currentTarget.value = '';
                  void uploadCover(file);
                }}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" disabled={uploading} onClick={() => fileInput.current?.click()} className="rounded-lg border border-border bg-white px-3 py-2 text-xs font-medium text-text hover:bg-black/5 disabled:opacity-60">
                  {uploading ? 'Uploading...' : coverPath ? 'Replace image' : 'Choose image'}
                </button>
                {coverPath && <button type="button" disabled={uploading} onClick={() => { setCoverPath(''); setPreviewUrl(''); setNotice('Cover image will be removed when you save.'); }} className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-danger hover:bg-danger-soft disabled:opacity-60">Remove image</button>}
              </div>
            </div>
          </div>
          {error && <p role="alert" className="mt-3 rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 text-xs text-danger">{error}</p>}
          {notice && !error && <p role="status" className="mt-3 text-xs text-success">{notice}</p>}
        </div>
      </div>

      <div className="md:col-span-2">
        <div className="flex flex-wrap gap-2">
          <button name="intent" value={editing ? 'save' : 'draft'} disabled={uploading} className="w-full rounded-lg border border-border bg-white px-5 py-3 text-sm font-medium text-text transition hover:bg-black/5 disabled:cursor-wait disabled:opacity-60 sm:w-auto">
            {editing ? 'Save changes' : 'Save as draft'}
          </button>
          {!alreadyPublished && <button name="intent" value="publish" disabled={uploading} className="w-full rounded-lg bg-brand px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-dark disabled:cursor-wait disabled:opacity-60 sm:w-auto">{editing ? 'Save and publish' : 'Publish to website'}</button>}
        </div>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-text-muted">{label}{children}</label>;
}
