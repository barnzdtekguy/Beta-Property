import { createClient } from '@/lib/supabase/server';

export type PropertyFilters = {
  location?: string;
  type?: string;
  listing?: string;
  minPrice?: string;
  maxPrice?: string;
};

const PROPERTY_TYPES = ['land', 'house', 'apartment', 'commercial', 'other'];
const LISTING_TYPES = ['sale', 'rent', 'lease'];

type PropertyImage = { id: string; storage_path: string; alt_text: string; sort_order: number };

async function addImageUrls<T extends { property_images: PropertyImage[] }>(
  properties: T[]
): Promise<Array<Omit<T, 'property_images'> & { property_images: Array<PropertyImage & { url: string }> }>> {
  const supabase = createClient();
  return Promise.all(
    properties.map(async (property) => {
      const images = await Promise.all(
        [...property.property_images]
          .sort((a, b) => a.sort_order - b.sort_order)
          .map(async (image) => {
            const { data, error } = await supabase.storage
              .from('property-images')
              .createSignedUrl(image.storage_path, 3600);
            if (error) throw error;
            return { ...image, url: data.signedUrl };
          })
      );
      return { ...property, property_images: images };
    })
  );
}

export async function getPublishedProperties(filters: PropertyFilters = {}) {
  const supabase = createClient();
  let query = supabase
    .from('properties')
    .select(
      'id, slug, title, description, property_type, listing_type, price, currency, city, state, bedrooms, bathrooms, area, area_unit, property_images(id, storage_path, alt_text, sort_order)'
    )
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  const location = filters.location?.trim();
  if (location) query = query.ilike('city', `%${location}%`);

  if (filters.type && PROPERTY_TYPES.includes(filters.type)) {
    query = query.eq('property_type', filters.type);
  }
  if (filters.listing && LISTING_TYPES.includes(filters.listing)) {
    query = query.eq('listing_type', filters.listing);
  }

  const minPrice = filters.minPrice ? Number(filters.minPrice) : undefined;
  const maxPrice = filters.maxPrice ? Number(filters.maxPrice) : undefined;
  if (minPrice !== undefined && Number.isFinite(minPrice) && minPrice >= 0) {
    query = query.gte('price', minPrice);
  }
  if (maxPrice !== undefined && Number.isFinite(maxPrice) && maxPrice >= 0) {
    query = query.lte('price', maxPrice);
  }

  const { data, error } = await query;
  if (error) throw error;
  return addImageUrls(data ?? []);
}

export async function getPublishedProperty(slug: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('properties')
    .select(
      'id, slug, title, description, property_type, listing_type, price, currency, address, city, state, bedrooms, bathrooms, area, area_unit, features, property_images(id, storage_path, alt_text, sort_order)'
    )
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  const [property] = await addImageUrls([data]);
  return property;
}

export function formatPropertyPrice(price: number | null, currency: string, listingType: string) {
  if (price === null) return 'Contact us for pricing';
  return `${currency} ${new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 }).format(price)}${listingType === 'rent' ? ' / year' : ''}`;
}
