'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getCurrentAdmin } from '@/lib/queries';
import { portalPath } from '@/lib/paths';
import { createClient } from '@/lib/supabase/server';

const TYPES = ['land', 'house', 'apartment', 'commercial', 'other'];
const LISTING_TYPES = ['sale', 'rent', 'lease'];
const STATUSES = ['draft', 'pending_review', 'published', 'archived'];
const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function fail(message: string): never {
  redirect(portalPath(`/admin/properties?error=${encodeURIComponent(message)}`));
}

export async function createProperty(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect(portalPath('/admin/login?error=not-authorized'));

  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const propertyType = String(formData.get('property_type') ?? '');
  const listingType = String(formData.get('listing_type') ?? '');
  const city = String(formData.get('city') ?? '').trim();
  const currency = String(formData.get('currency') ?? '').trim().toUpperCase();
  const rawSlug = String(formData.get('slug') ?? title)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const priceValue = String(formData.get('price') ?? '').trim();
  const price = priceValue ? Number(priceValue) : null;
  const rawFeatures = String(formData.get('features') ?? '');
  const features = rawFeatures.split(/\r?\n/).map((value) => value.trim()).filter(Boolean).slice(0, 30);
  const images = formData.getAll('images').filter((file): file is File => file instanceof File && file.size > 0);
  const imageAltText = String(formData.get('image_alt_text') ?? '').trim();
  const bedroomsRaw = String(formData.get('bedrooms') ?? '').trim();
  const bathroomsRaw = String(formData.get('bathrooms') ?? '').trim();
  const areaRaw = String(formData.get('area') ?? '').trim();
  const bedrooms = numericInteger(bedroomsRaw);
  const bathrooms = numericInteger(bathroomsRaw);
  const area = numericNonNegative(areaRaw);

  if (
    title.length < 3 || title.length > 180 ||
    description.length < 20 || description.length > 12000 ||
    !rawSlug || rawSlug.length > 180 ||
    !TYPES.includes(propertyType) ||
    !LISTING_TYPES.includes(listingType) ||
    city.length < 2 || city.length > 120 ||
    !/^[A-Z]{3}$/.test(currency) ||
    (price !== null && (!Number.isFinite(price) || price < 0))
  ) {
    fail('Check the property fields and try again.');
  }
  if (
    (bedroomsRaw && bedrooms === null) ||
    (bathroomsRaw && bathrooms === null) ||
    (areaRaw && area === null)
  ) {
    fail('Bedrooms and bathrooms must be whole numbers; area must be a non-negative number.');
  }
  if (images.length > 10 || images.some((file) => file.size > 10 * 1024 * 1024 || !MIME_EXTENSIONS[file.type])) {
    fail('Upload up to 10 JPEG, PNG, or WebP photos, each no larger than 10 MB.');
  }
  if (images.length && (imageAltText.length < 5 || imageAltText.length > 240)) {
    fail('Provide a short, descriptive alt text for the property photos.');
  }

  const supabase = createClient();
  const { data: property, error } = await supabase
    .from('properties')
    .insert({
      slug: rawSlug,
      title,
      description,
      property_type: propertyType,
      listing_type: listingType,
      status: 'draft',
      price,
      currency,
      address: String(formData.get('address') ?? '').trim() || null,
      city,
      state: String(formData.get('state') ?? '').trim() || null,
      bedrooms,
      bathrooms,
      area,
      area_unit: String(formData.get('area_unit') ?? '').trim() || null,
      features,
      created_by: admin.id,
    })
    .select('id')
    .single();

  if (error || !property) {
    console.error('[createProperty] property insert failed:', error?.message ?? 'No property created');
    fail(error?.code === '23505' ? 'That property slug is already in use.' : 'The property could not be saved.');
  }

  const uploadedPaths: string[] = [];
  for (const image of images) {
    const storagePath = `${property.id}/${crypto.randomUUID()}.${MIME_EXTENSIONS[image.type]}`;
    const { error: uploadError } = await supabase.storage
      .from('property-images')
      .upload(storagePath, image, { contentType: image.type, upsert: false });

    if (uploadError) {
      console.error('[createProperty] image upload failed:', uploadError.message);
      if (uploadedPaths.length) await supabase.storage.from('property-images').remove(uploadedPaths);
      fail('The property was saved as a draft, but an image upload failed. Retry after checking Storage permissions.');
    }
    uploadedPaths.push(storagePath);
  }

  if (uploadedPaths.length) {
    const { error: imageError } = await supabase.from('property_images').insert(
      uploadedPaths.map((storagePath, sort_order) => ({
        property_id: property.id,
        storage_path: storagePath,
        alt_text: imageAltText,
        sort_order,
      }))
    );
    if (imageError) {
      console.error('[createProperty] image metadata insert failed:', imageError.message);
      await supabase.storage.from('property-images').remove(uploadedPaths);
      fail('The property was saved as a draft, but its image records could not be saved.');
    }
  }

  revalidatePath(portalPath('/admin/properties'));
  revalidatePath('/properties');
  redirect(portalPath('/admin/properties?created=1'));
}

export async function changePropertyStatus(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect(portalPath('/admin/login?error=not-authorized'));

  const id = String(formData.get('property_id') ?? '');
  const status = String(formData.get('status') ?? '');
  if (!id || !STATUSES.includes(status)) fail('Invalid property status update.');

  const supabase = createClient();
  const { data, error } = await supabase
    .from('properties')
    .update({
      status,
      published_at: status === 'published' ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error || !data) {
    console.error('[changePropertyStatus] property update failed:', error?.message ?? 'No property updated');
    fail('The property status could not be updated.');
  }

  revalidatePath(portalPath('/admin/properties'));
  revalidatePath('/properties');
  redirect(portalPath('/admin/properties?updated=1'));
}

export async function assignPropertyToAgent(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect(portalPath('/admin/login?error=not-authorized'));

  const propertyId = String(formData.get('property_id') ?? '');
  const agentId = String(formData.get('agent_id') ?? '');
  if (!propertyId || !agentId) fail('Select a property and an approved agent.');

  const supabase = createClient();
  const { data: agent, error: agentError } = await supabase
    .from('users')
    .select('id')
    .eq('id', agentId)
    .eq('status', 'active')
    .maybeSingle();
  if (agentError || !agent) fail('Only approved agents can be assigned properties.');
  const { error: assignmentError } = await supabase
    .from('agent_property_assignments')
    .upsert(
      { property_id: propertyId, agent_id: agentId, assigned_by: admin.id },
      { onConflict: 'property_id,agent_id', ignoreDuplicates: true }
    );
  if (assignmentError) {
    console.error('[assignPropertyToAgent] assignment failed:', assignmentError.message);
    fail('The agent could not be assigned to this property.');
  }

  revalidatePath(portalPath('/admin/properties'));
  revalidatePath(portalPath('/dashboard'));
  redirect(portalPath('/admin/properties?updated=1'));
}

export async function removePropertyAssignment(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect(portalPath('/admin/login?error=not-authorized'));

  const assignmentId = String(formData.get('assignment_id') ?? '');
  if (!assignmentId) fail('Select an assignment to remove.');
  const supabase = createClient();
  const { error } = await supabase
    .from('agent_property_assignments')
    .delete()
    .eq('id', assignmentId);

  if (error) {
    console.error('[removePropertyAssignment] removal failed:', error.message);
    fail('The property assignment could not be removed.');
  }
  revalidatePath(portalPath('/admin/properties'));
  revalidatePath(portalPath('/dashboard'));
  redirect(portalPath('/admin/properties?updated=1'));
}

function numericNonNegative(value: FormDataEntryValue | null) {
  const stringValue = String(value ?? '').trim();
  if (!stringValue) return null;
  const number = Number(stringValue);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function numericInteger(value: FormDataEntryValue | null) {
  const number = numericNonNegative(value);
  return number !== null && Number.isInteger(number) ? number : null;
}
