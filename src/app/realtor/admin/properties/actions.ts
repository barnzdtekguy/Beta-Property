'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getCurrentAdmin } from '@/lib/queries';
import { getCurrentRealtor } from '@/lib/realtor-queries';
import { portalPath } from '@/lib/paths';
import { createClient } from '@/lib/supabase/server';

const TYPES = ['land', 'house', 'duplex', 'apartment', 'commercial', 'other'];
const LISTING_TYPES = ['sale', 'rent', 'lease'];
const PUBLICATION_STATUSES = ['draft', 'published', 'archived'];
const AVAILABILITY_STATUSES = ['available', 'sold', 'rented', 'leased'];
const FURNISHING_STATUSES = ['unfurnished', 'partly_furnished', 'furnished'];
const CONDITIONS = ['new', 'excellent', 'good', 'fair', 'needs_renovation', 'under_construction'];
const AMENITIES = [
  'Swimming Pool', 'Gym', 'Security', 'CCTV', 'Generator', '24/7 Electricity',
  'Water Supply', 'Garden', 'Balcony', 'Fitted Kitchen', 'Air Conditioning', 'Parking Space',
];
const MAX_PROPERTY_IMAGES = 30;

type PropertyFields = {
  title: string;
  slug: string;
  description: string;
  property_type: string;
  listing_type: string;
  price: number | null;
  currency: string;
  negotiable: boolean;
  country: string;
  state: string;
  city: string;
  neighborhood: string | null;
  address: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  toilets: number | null;
  parking_spaces: number | null;
  area: number | null;
  area_unit: string | null;
  land_size: number | null;
  land_size_unit: string | null;
  furnishing_status: string | null;
  property_condition: string | null;
  amenities: string[];
  features: string[];
};

function fail(message: string, path = '/admin/properties'): never {
  redirect(portalPath(`${path}?error=${encodeURIComponent(message)}`));
}

function failRealtor(message: string, path = '/dashboard/properties/new'): never {
  redirect(portalPath(`${path}?error=${encodeURIComponent(message)}`));
}

function normalizedSlug(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function optionalNumber(value: FormDataEntryValue | null, integer = false) {
  const raw = String(value ?? '').trim();
  if (!raw) return { value: null, valid: true };
  const number = Number(raw);
  const valid = Number.isFinite(number) && number >= 0 && (!integer || Number.isInteger(number));
  return { value: valid ? number : null, valid };
}

function parsePropertyFields(formData: FormData): { fields: PropertyFields | null; error: string | null } {
  const title = String(formData.get('title') ?? '').trim();
  const typedSlug = String(formData.get('slug') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const propertyType = String(formData.get('property_type') ?? '');
  const listingType = String(formData.get('listing_type') ?? '');
  const currency = String(formData.get('currency') ?? 'NGN').trim().toUpperCase();
  const country = String(formData.get('country') ?? '').trim();
  const state = String(formData.get('state') ?? '').trim();
  const city = String(formData.get('city') ?? '').trim();
  const neighborhood = String(formData.get('neighborhood') ?? '').trim();
  const address = String(formData.get('address') ?? '').trim();
  const rawPrice = String(formData.get('price') ?? '').trim();
  const price = optionalNumber(rawPrice);
  const bedrooms = optionalNumber(formData.get('bedrooms'), true);
  const bathrooms = optionalNumber(formData.get('bathrooms'), true);
  const toilets = optionalNumber(formData.get('toilets'), true);
  const parkingSpaces = optionalNumber(formData.get('parking_spaces'), true);
  const area = optionalNumber(formData.get('area'));
  const landSize = optionalNumber(formData.get('land_size'));
  const furnishing = String(formData.get('furnishing_status') ?? '').trim();
  const condition = String(formData.get('property_condition') ?? '').trim();
  const amenities = formData.getAll('amenities').map(String);
  const features = String(formData.get('features') ?? '')
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 30);
  const slug = normalizedSlug(typedSlug || title);

  if (title.length < 3 || title.length > 180) return { fields: null, error: 'Enter a property title between 3 and 180 characters.' };
  if (description.length < 20 || description.length > 12000) return { fields: null, error: 'Enter a property description between 20 and 12,000 characters.' };
  if (!slug || slug.length > 180) return { fields: null, error: 'Enter a valid property URL slug.' };
  if (!TYPES.includes(propertyType)) return { fields: null, error: 'Choose a valid property type.' };
  if (!LISTING_TYPES.includes(listingType)) return { fields: null, error: 'Choose sale, rent, or lease.' };
  if (!['NGN', 'USD', 'GBP'].includes(currency)) return { fields: null, error: 'Choose NGN, USD, or GBP as the currency.' };
  if (!country || country.length > 80 || state.length > 120 || city.length < 2 || city.length > 120) {
    return { fields: null, error: 'Enter a country and city, and check the state field.' };
  }
  if (neighborhood.length > 120 || address.length > 500) return { fields: null, error: 'Check the neighborhood and full address fields.' };
  if (!price.valid || !bedrooms.valid || !bathrooms.valid || !toilets.valid || !parkingSpaces.valid || !area.valid || !landSize.valid) {
    return { fields: null, error: 'Prices and property measurements must be non-negative numbers; room counts must be whole numbers.' };
  }
  if (furnishing && !FURNISHING_STATUSES.includes(furnishing)) return { fields: null, error: 'Choose a valid furnishing status.' };
  if (condition && !CONDITIONS.includes(condition)) return { fields: null, error: 'Choose a valid property condition.' };
  if (amenities.some((amenity) => !AMENITIES.includes(amenity))) return { fields: null, error: 'Choose valid amenities.' };

  const value = (name: string) => String(formData.get(name) ?? '').trim() || null;
  return {
    error: null,
    fields: {
      title,
      slug,
      description,
      property_type: propertyType,
      listing_type: listingType,
      price: price.value,
      currency,
      negotiable: formData.get('negotiable') === 'on',
      country,
      state,
      city,
      neighborhood: neighborhood || null,
      address: address || null,
      bedrooms: bedrooms.value,
      bathrooms: bathrooms.value,
      toilets: toilets.value,
      parking_spaces: parkingSpaces.value,
      area: area.value,
      area_unit: value('area_unit'),
      land_size: landSize.value,
      land_size_unit: value('land_size_unit'),
      furnishing_status: furnishing || null,
      property_condition: condition || null,
      amenities: [...new Set(amenities)],
      features,
    },
  };
}

function revalidatePropertyPages(slug?: string | null) {
  revalidatePath(portalPath('/admin/properties'));
  revalidatePath('/properties');
  if (slug) revalidatePath(`/properties/${slug}`);
}

export async function createProperty(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect(portalPath('/admin/login?error=not-authorized'));

  const parsed = parsePropertyFields(formData);
  if (!parsed.fields) fail(parsed.error ?? 'Check the property details.', '/admin/properties/new');

  const intent = String(formData.get('intent') ?? 'draft');
  const status = intent === 'publish' ? 'published' : 'draft';
  const supabase = await createClient();
  const { data: property, error } = await supabase
    .from('properties')
    .insert({
      ...parsed.fields,
      status,
      published_at: status === 'published' ? new Date().toISOString() : null,
      created_by: admin.id,
    })
    .select('id')
    .single();

  if (error || !property) {
    console.error('[createProperty] property insert failed:', error?.message ?? 'No property created');
    fail(error?.code === '23505' ? 'That property URL is already in use.' : 'The property could not be saved. Check that migration 009 has been applied.', '/admin/properties/new');
  }

  revalidatePropertyPages(parsed.fields.slug);
  redirect(portalPath(`/admin/properties/${property.id}?created=1#images`));
}

export async function updateProperty(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect(portalPath('/admin/login?error=not-authorized'));

  const id = String(formData.get('property_id') ?? '');
  if (!id) fail('Property not found.');
  const path = `/admin/properties/${id}`;
  const parsed = parsePropertyFields(formData);
  if (!parsed.fields) fail(parsed.error ?? 'Check the property details.', path);

  const supabase = await createClient();
  const { data: existing, error: lookupError } = await supabase
    .from('properties')
    .select('id, slug, status, published_at')
    .eq('id', id)
    .maybeSingle();
  if (lookupError || !existing) fail('Property not found.', '/admin/properties');

  const intent = String(formData.get('intent') ?? 'save');
  const status = intent === 'publish' ? 'published' : intent === 'draft' ? 'draft' : existing.status;
  const { error } = await supabase
    .from('properties')
    .update({
      ...parsed.fields,
      status,
      published_at: status === 'published' ? existing.published_at ?? new Date().toISOString() : null,
    })
    .eq('id', id);

  if (error) {
    console.error('[updateProperty] property update failed:', error.message);
    fail(error.code === '23505' ? 'That property URL is already in use.' : 'The property could not be updated. Check that migration 009 has been applied.', path);
  }

  revalidatePropertyPages(existing.slug);
  revalidatePropertyPages(parsed.fields.slug);
  redirect(portalPath(`${path}?updated=1`));
}

export async function submitRealtorProperty(formData: FormData) {
  const realtor = await getCurrentRealtor();
  if (!realtor) redirect(portalPath('/login?error=not-authorized'));

  const parsed = parsePropertyFields(formData);
  if (!parsed.fields) failRealtor(parsed.error ?? 'Check the property details.');

  const supabase = await createClient();
  const { data: property, error } = await supabase
    .from('properties')
    .insert({
      ...parsed.fields,
      status: 'pending_review',
      published_at: null,
      submitted_by: realtor.id,
      created_by: null,
    })
    .select('id')
    .single();

  if (error || !property) {
    console.error('[submitRealtorProperty] property submission failed:', error?.message ?? 'No property created');
    failRealtor(error?.code === '23505' ? 'That property URL is already in use.' : 'The property could not be submitted. Check that migration 012 has been applied.');
  }

  revalidatePath(portalPath('/dashboard'));
  revalidatePath(portalPath('/dashboard/properties'));
  revalidatePath(portalPath('/admin/properties'));
  redirect(portalPath(`/dashboard/properties/${property.id}?submitted=1#images`));
}

export async function updateRealtorProperty(formData: FormData) {
  const realtor = await getCurrentRealtor();
  if (!realtor) redirect(portalPath('/login?error=not-authorized'));

  const id = String(formData.get('property_id') ?? '');
  if (!id) failRealtor('Property not found.', '/dashboard/properties');
  const path = `/dashboard/properties/${id}`;
  const parsed = parsePropertyFields(formData);
  if (!parsed.fields) failRealtor(parsed.error ?? 'Check the property details.', path);

  const supabase = await createClient();
  const { data: existing, error: lookupError } = await supabase
    .from('properties')
    .select('id, slug')
    .eq('id', id)
    .eq('submitted_by', realtor.id)
    .eq('status', 'pending_review')
    .maybeSingle();
  if (lookupError || !existing) failRealtor('Only your properties awaiting review can be changed.', '/dashboard/properties');

  const { error } = await supabase
    .from('properties')
    .update(parsed.fields)
    .eq('id', id)
    .eq('submitted_by', realtor.id)
    .eq('status', 'pending_review');
  if (error) {
    console.error('[updateRealtorProperty] property update failed:', error.message);
    failRealtor('The property details could not be saved.', path);
  }

  revalidatePropertyPages(existing.slug);
  revalidatePropertyPages(parsed.fields.slug);
  revalidatePath(portalPath('/dashboard'));
  revalidatePath(portalPath('/dashboard/properties'));
  redirect(portalPath(`${path}?updated=1`));
}

export async function changePropertyStatus(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect(portalPath('/admin/login?error=not-authorized'));

  const id = String(formData.get('property_id') ?? '');
  const status = String(formData.get('status') ?? '');
  if (!id || !PUBLICATION_STATUSES.includes(status)) fail('Invalid property publication status.');

  const supabase = await createClient();
  const { data: property, error } = await supabase
    .from('properties')
    .update({ status, published_at: status === 'published' ? new Date().toISOString() : null })
    .eq('id', id)
    .select('id, slug')
    .maybeSingle();

  if (error || !property) {
    console.error('[changePropertyStatus] property update failed:', error?.message ?? 'No property updated');
    fail('The property publication status could not be updated.');
  }

  revalidatePropertyPages(property.slug);
  redirect(portalPath('/admin/properties?updated=1'));
}

export async function changePropertyAvailability(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect(portalPath('/admin/login?error=not-authorized'));

  const id = String(formData.get('property_id') ?? '');
  const availability = String(formData.get('availability_status') ?? '');
  if (!id || !AVAILABILITY_STATUSES.includes(availability)) fail('Invalid property availability status.');

  const supabase = await createClient();
  const { data: property, error } = await supabase
    .from('properties')
    .update({ availability_status: availability })
    .eq('id', id)
    .select('id, slug')
    .maybeSingle();

  if (error || !property) {
    console.error('[changePropertyAvailability] property update failed:', error?.message ?? 'No property updated');
    fail('The property availability could not be updated. Check that migration 009 has been applied.');
  }

  revalidatePropertyPages(property.slug);
  redirect(portalPath('/admin/properties?updated=1'));
}

async function getPropertyEditor(propertyId: string) {
  const admin = await getCurrentAdmin();
  const realtor = admin ? null : await getCurrentRealtor();
  if (!admin && !realtor) return { ok: false as const, error: 'Your session has expired. Sign in again.' };

  const supabase = await createClient();
  let query = supabase
    .from('properties')
    .select('id, slug, title, submitted_by, status')
    .eq('id', propertyId);
  if (realtor) query = query.eq('submitted_by', realtor.id).eq('status', 'pending_review');
  const { data: property, error } = await query.maybeSingle();
  if (error || !property) return { ok: false as const, error: 'Property not found or no longer editable.' };
  return { ok: true as const, supabase, property };
}

export async function addPropertyImage(propertyId: string, storagePath: string, altText: string) {
  if (!propertyId || !storagePath.startsWith(`${propertyId}/`) || storagePath.includes('..')) {
    return { ok: false as const, error: 'Invalid image upload path.' };
  }

  const editor = await getPropertyEditor(propertyId);
  if (!editor.ok) return editor;
  const { supabase, property } = editor;
  const { count } = await supabase
    .from('property_images')
    .select('id', { count: 'exact', head: true })
    .eq('property_id', propertyId);
  if ((count ?? 0) >= MAX_PROPERTY_IMAGES) return { ok: false as const, error: `A property can have up to ${MAX_PROPERTY_IMAGES} images.` };

  const { data: lastImage } = await supabase
    .from('property_images')
    .select('sort_order')
    .eq('property_id', propertyId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  const safeAlt = altText.trim().slice(0, 240) || `${property.title} property photo`;
  const { data: image, error } = await supabase
    .from('property_images')
    .insert({
      property_id: propertyId,
      storage_path: storagePath,
      alt_text: safeAlt,
      sort_order: (lastImage?.sort_order ?? -1) + 1,
    })
    .select('id, property_id, storage_path, alt_text, sort_order, created_at')
    .single();
  if (error || !image) {
    console.error('[addPropertyImage] image record insert failed:', error?.message ?? 'No image record created');
    return { ok: false as const, error: 'The uploaded image could not be added to the property gallery.' };
  }

  revalidatePropertyPages(property.slug);
  revalidatePath(portalPath(`/dashboard/properties/${propertyId}`));
  return { ok: true as const, image };
}

export async function updatePropertyImageAltText(propertyId: string, imageId: string, altText: string) {
  const editor = await getPropertyEditor(propertyId);
  if (!editor.ok) return editor;
  const safeAlt = altText.trim();
  if (safeAlt.length < 3 || safeAlt.length > 240) return { ok: false as const, error: 'Image descriptions must be 3–240 characters.' };

  const { supabase } = editor;
  const { data: image, error } = await supabase
    .from('property_images')
    .update({ alt_text: safeAlt })
    .eq('id', imageId)
    .eq('property_id', propertyId)
    .select('id')
    .maybeSingle();
  if (error || !image) return { ok: false as const, error: 'The image description could not be saved.' };
  revalidatePath(portalPath(`/admin/properties/${propertyId}`));
  revalidatePath(portalPath(`/dashboard/properties/${propertyId}`));
  return { ok: true as const };
}

export async function setPropertyImageOrder(propertyId: string, imageIds: string[]) {
  const editor = await getPropertyEditor(propertyId);
  if (!editor.ok) return editor;
  if (!propertyId || new Set(imageIds).size !== imageIds.length) return { ok: false as const, error: 'The image order is invalid.' };

  const { supabase } = editor;
  const { data: images, error: listError } = await supabase
    .from('property_images')
    .select('id')
    .eq('property_id', propertyId);
  if (listError || !images || images.length !== imageIds.length || images.some((image) => !imageIds.includes(image.id))) {
    return { ok: false as const, error: 'The image gallery changed. Refresh and try again.' };
  }

  for (const [sortOrder, imageId] of imageIds.entries()) {
    const { error } = await supabase
      .from('property_images')
      .update({ sort_order: sortOrder })
      .eq('id', imageId)
      .eq('property_id', propertyId);
    if (error) return { ok: false as const, error: 'The image order could not be saved.' };
  }
  revalidatePath(portalPath(`/admin/properties/${propertyId}`));
  revalidatePath(portalPath(`/dashboard/properties/${propertyId}`));
  return { ok: true as const };
}

export async function deletePropertyImage(propertyId: string, imageId: string) {
  const editor = await getPropertyEditor(propertyId);
  if (!editor.ok) return editor;

  const { supabase } = editor;
  const { data: image, error: lookupError } = await supabase
    .from('property_images')
    .select('id, storage_path')
    .eq('id', imageId)
    .eq('property_id', propertyId)
    .maybeSingle();
  if (lookupError || !image) return { ok: false as const, error: 'Image not found.' };

  const { error: storageError } = await supabase.storage.from('property-images').remove([image.storage_path]);
  if (storageError) {
    console.error('[deletePropertyImage] storage deletion failed:', storageError.message);
    return { ok: false as const, error: 'The image file could not be deleted from storage.' };
  }
  const { error: rowError } = await supabase.from('property_images').delete().eq('id', imageId).eq('property_id', propertyId);
  if (rowError) {
    console.error('[deletePropertyImage] image record deletion failed:', rowError.message);
    return { ok: false as const, error: 'The image file was deleted, but its gallery record could not be removed.' };
  }

  const { data: remaining } = await supabase
    .from('property_images')
    .select('id')
    .eq('property_id', propertyId)
    .order('sort_order', { ascending: true });
  if (remaining) await setPropertyImageOrder(propertyId, remaining.map((row) => row.id));
  revalidatePath(portalPath(`/admin/properties/${propertyId}`));
  revalidatePath(portalPath(`/dashboard/properties/${propertyId}`));
  return { ok: true as const };
}

export async function deleteProperty(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect(portalPath('/admin/login?error=not-authorized'));
  const id = String(formData.get('property_id') ?? '');
  if (!id) fail('Property not found.');

  const supabase = await createClient();
  const [{ data: property, error: propertyError }, { data: images, error: imageError }] = await Promise.all([
    supabase.from('properties').select('id, slug').eq('id', id).maybeSingle(),
    supabase.from('property_images').select('storage_path').eq('property_id', id),
  ]);
  if (propertyError || imageError || !property) fail('The property could not be found.');

  const paths = (images ?? []).map((image) => image.storage_path);
  if (paths.length) {
    const { error } = await supabase.storage.from('property-images').remove(paths);
    if (error) {
      console.error('[deleteProperty] storage cleanup failed:', error.message);
      fail('The property was kept because its images could not be removed from storage.');
    }
  }

  const { error } = await supabase.from('properties').delete().eq('id', id);
  if (error) {
    console.error('[deleteProperty] property deletion failed:', error.message);
    fail('Property images were removed, but the property record could not be deleted. Retry the delete.');
  }
  revalidatePropertyPages(property.slug);
  redirect(portalPath('/admin/properties?deleted=1'));
}

export async function assignPropertyToAgent(formData: FormData) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect(portalPath('/admin/login?error=not-authorized'));

  const propertyId = String(formData.get('property_id') ?? '');
  const agentId = String(formData.get('agent_id') ?? '');
  if (!propertyId || !agentId) fail('Select a property and an approved agent.');

  const supabase = await createClient();
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
  const supabase = await createClient();
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
