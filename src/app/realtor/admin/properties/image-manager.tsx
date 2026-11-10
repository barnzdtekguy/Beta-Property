'use client';

import Image from 'next/image';
import { useRef, useState, type DragEvent } from 'react';
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/client';
import { addPropertyImage, deletePropertyImage, setPropertyImageOrder, updatePropertyImageAltText } from './actions';

type StoredImage = {
  id: string;
  storage_path: string;
  alt_text: string;
  sort_order: number;
  url: string | null;
};

type GalleryItem = {
  key: string;
  id?: string;
  storagePath?: string;
  file?: File;
  altText: string;
  url: string | null;
};

const MAX_IMAGES = 30;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export function ImageManager({
  propertyId,
  propertyTitle,
  initialImages,
}: {
  propertyId: string;
  propertyTitle: string;
  initialImages: StoredImage[];
}) {
  const [items, setItems] = useState<GalleryItem[]>(() => initialImages.map((image) => ({
    key: image.id,
    id: image.id,
    storagePath: image.storage_path,
    altText: image.alt_text,
    url: image.url,
  })));
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, activeFile: '' });
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const draggedKey = useRef<string | null>(null);

  function queueFiles(fileList: FileList | File[]) {
    setError('');
    setNotice('');
    const files = Array.from(fileList);
    const remaining = Math.max(0, MAX_IMAGES - items.length);
    const accepted: GalleryItem[] = [];
    for (const file of files) {
      if (accepted.length >= remaining) break;
      if (!MIME_EXTENSIONS[file.type]) {
        setError(`${file.name} is not a supported image. Choose JPEG, PNG, or WebP.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(`${file.name} is larger than 10 MB.`);
        continue;
      }
      accepted.push({
        key: crypto.randomUUID(),
        file,
        altText: `${propertyTitle}, ${file.name.replace(/\.[^.]+$/, '')}`.slice(0, 240),
        url: URL.createObjectURL(file),
      });
    }
    if (files.length > remaining) setError(`A property can have up to ${MAX_IMAGES} images. Remove an image before adding more.`);
    if (accepted.length) setItems((current) => [...current, ...accepted]);
  }

  function reorderItems(fromKey: string, toKey: string) {
    if (fromKey === toKey) return;
    setItems((current) => {
      const from = current.findIndex((item) => item.key === fromKey);
      const to = current.findIndex((item) => item.key === toKey);
      if (from < 0 || to < 0) return current;
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      const storedIds = next.flatMap((item) => item.id ? [item.id] : []);
      void setPropertyImageOrder(propertyId, storedIds).then((result) => {
        if (!result.ok) setError(result.error);
        else setNotice('Gallery order saved. The first photo is the cover image.');
      });
      return next;
    });
  }

  async function makeCover(item: GalleryItem) {
    const next = [item, ...items.filter((candidate) => candidate.key !== item.key)];
    setItems(next);
    const ids = next.flatMap((candidate) => candidate.id ? [candidate.id] : []);
    const result = await setPropertyImageOrder(propertyId, ids);
    if (!result.ok) setError(result.error);
    else setNotice('Cover image updated.');
  }

  async function removeItem(item: GalleryItem) {
    setError('');
    setNotice('');
    if (item.id) {
      if (!window.confirm('Delete this property image? This also removes the stored file.')) return;
      setBusyKey(item.key);
      const result = await deletePropertyImage(propertyId, item.id);
      setBusyKey(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setItems((current) => current.filter((candidate) => candidate.key !== item.key));
      setNotice('Image deleted.');
      return;
    }
    if (item.url) URL.revokeObjectURL(item.url);
    setItems((current) => current.filter((candidate) => candidate.key !== item.key));
  }

  async function saveAltText(item: GalleryItem, altText: string) {
    setItems((current) => current.map((candidate) => candidate.key === item.key ? { ...candidate, altText } : candidate));
    if (!item.id) return;
    const result = await updatePropertyImageAltText(propertyId, item.id, altText);
    if (!result.ok) setError(result.error);
    else setNotice('Image description saved.');
  }

  async function uploadQueued() {
    const queued = items.filter((item) => item.file);
    if (!queued.length || uploading) return;
    setError('');
    setNotice('');
    setUploading(true);
    setUploadProgress({ current: 0, total: queued.length, activeFile: queued[0].file?.name ?? '' });
    const supabase = createBrowserSupabaseClient();
    let uploaded = 0;
    let failed = 0;

    for (const [index, item] of queued.entries()) {
      const file = item.file!;
      const extension = MIME_EXTENSIONS[file.type];
      const storagePath = `${propertyId}/${crypto.randomUUID()}.${extension}`;
      setUploadProgress({ current: index, total: queued.length, activeFile: file.name });

      try {
        const { error: uploadError } = await supabase.storage
          .from('property-images')
          .upload(storagePath, file, { contentType: file.type, cacheControl: '3600', upsert: false });
        if (uploadError) throw uploadError;

        const attached = await addPropertyImage(propertyId, storagePath, item.altText);
        if (!attached.ok) {
          await supabase.storage.from('property-images').remove([storagePath]);
          throw new Error(attached.error);
        }

        const { data: signed } = await supabase.storage.from('property-images').createSignedUrl(storagePath, 3600);
        if (item.url) URL.revokeObjectURL(item.url);
        setItems((current) => current.map((candidate) => candidate.key === item.key ? {
          key: attached.image.id,
          id: attached.image.id,
          storagePath,
          altText: attached.image.alt_text,
          url: signed?.signedUrl ?? null,
        } : candidate));
        uploaded += 1;
      } catch (uploadError) {
        failed += 1;
        const message = uploadError instanceof Error ? uploadError.message : 'Image upload failed.';
        setError(`${file.name}: ${message}`);
      }
      setUploadProgress({ current: index + 1, total: queued.length, activeFile: index + 1 < queued.length ? queued[index + 1].file?.name ?? '' : '' });
    }

    setUploading(false);
    setNotice(failed ? `${uploaded} of ${queued.length} images uploaded. Fix the error and retry the remaining files.` : `${uploaded} ${uploaded === 1 ? 'image' : 'images'} uploaded successfully.`);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (event.dataTransfer.files.length) queueFiles(event.dataTransfer.files);
  }

  const progressPercent = uploadProgress.total ? Math.round((uploadProgress.current / uploadProgress.total) * 100) : 0;

  return (
    <div className="space-y-4">
      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
        className="rounded-xl border-2 border-dashed border-border bg-paper/60 p-5 text-center transition hover:border-brand/50 md:p-8"
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="sr-only"
          onChange={(event) => {
            if (event.currentTarget.files) queueFiles(event.currentTarget.files);
            event.currentTarget.value = '';
          }}
        />
        <p className="font-medium text-text">Drag property photos here</p>
        <p className="mt-1 text-xs text-text-muted">JPEG, PNG, or WebP · up to 10 MB each · {items.length}/{MAX_IMAGES} photos</p>
        <button type="button" onClick={() => inputRef.current?.click()} className="mt-4 rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-text hover:bg-black/5">
          Choose images
        </button>
      </div>

      {items.length > 0 && (
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-text">Gallery order <span className="font-normal text-text-muted">(drag photos to reorder; the first image is the cover)</span></p>
            {items.some((item) => item.file) && (
              <button type="button" disabled={uploading} onClick={uploadQueued} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60">
                {uploading ? 'Uploading…' : `Upload ${items.filter((item) => item.file).length} ${items.filter((item) => item.file).length === 1 ? 'photo' : 'photos'}`}
              </button>
            )}
          </div>

          {uploading && (
            <div className="mb-4 rounded-lg border border-brand/20 bg-brand/5 p-3" role="status" aria-live="polite">
              <div className="flex items-center justify-between gap-3 text-xs text-text-muted">
                <span className="truncate">Uploading {uploadProgress.activeFile}</span>
                <span className="shrink-0">{uploadProgress.current} of {uploadProgress.total} complete</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/10">
                <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item, index) => (
              <div
                key={item.key}
                draggable={!uploading && !busyKey}
                onDragStart={(event) => {
                  draggedKey.current = item.key;
                  event.dataTransfer.effectAllowed = 'move';
                  event.dataTransfer.setData('text/plain', item.key);
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  const from = event.dataTransfer.getData('text/plain') || draggedKey.current;
                  if (from) reorderItems(from, item.key);
                  draggedKey.current = null;
                }}
                className="overflow-hidden rounded-xl border border-border bg-white shadow-sm"
              >
                <div className="relative aspect-[4/3] bg-stone-100">
                  {item.url ? <Image src={item.url} alt={item.altText} fill unoptimized sizes="(max-width: 640px) 100vw, 33vw" className="object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-text-muted">Preview unavailable</div>}
                  <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-medium text-white">
                    {index === 0 ? 'Cover image' : `Photo ${index + 1}`}
                  </span>
                  {item.file && <span className="absolute right-2 top-2 rounded-full bg-amber-400 px-2 py-1 text-[10px] font-semibold text-amber-950">Not uploaded</span>}
                </div>
                <div className="space-y-3 p-3">
                  <label className="block text-[11px] font-medium text-text-muted">
                    Image description
                    <input
                      value={item.altText}
                      maxLength={240}
                      onChange={(event) => setItems((current) => current.map((candidate) => candidate.key === item.key ? { ...candidate, altText: event.target.value } : candidate))}
                      onBlur={(event) => void saveAltText(item, event.currentTarget.value)}
                      className="mt-1 w-full rounded-md border border-border px-2.5 py-2 text-xs text-text"
                    />
                  </label>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {index > 0 && item.id ? <button type="button" onClick={() => void makeCover(item)} className="text-xs font-medium text-brand hover:underline">Set as cover</button> : <span className="text-[11px] text-text-faint">{index === 0 ? 'Current cover' : 'Upload to set cover'}</span>}
                    <button type="button" disabled={busyKey === item.key || uploading} onClick={() => void removeItem(item)} className="text-xs font-medium text-danger hover:underline disabled:opacity-50">
                      {busyKey === item.key ? 'Deleting…' : 'Remove'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <p role="alert" className="rounded-lg border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}
      {notice && !error && <p role="status" className="rounded-lg bg-success-soft px-4 py-3 text-sm text-success">{notice}</p>}
    </div>
  );
}
